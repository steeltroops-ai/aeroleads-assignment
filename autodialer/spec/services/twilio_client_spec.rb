# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Services::TwilioClient do
  let(:account_sid) { 'AC_test_account_sid' }
  let(:auth_token) { 'test_auth_token' }
  let(:from_number) { '+18005551234' }
  let(:to_number) { '+18005559999' }
  
  let(:twilio_client) do
    described_class.new(
      account_sid: account_sid,
      auth_token: auth_token,
      from_number: from_number
    )
  end

  let(:mock_twilio_client) { instance_double(Twilio::REST::Client) }
  let(:mock_calls) { instance_double('Twilio::REST::Api::V2010::AccountContext::CallList') }
  let(:mock_call_context) { instance_double('Twilio::REST::Api::V2010::AccountContext::CallContext') }

  before do
    allow(Twilio::REST::Client).to receive(:new).and_return(mock_twilio_client)
    allow(mock_twilio_client).to receive(:calls).and_return(mock_calls)
  end

  describe '#initialize' do
    context 'with valid configuration' do
      it 'creates a new instance' do
        expect(twilio_client).to be_a(Services::TwilioClient)
        expect(twilio_client.from_number).to eq(from_number)
      end
    end

    context 'with missing configuration' do
      it 'raises ConfigurationError when account_sid is missing' do
        expect {
          described_class.new(account_sid: nil, auth_token: auth_token, from_number: from_number)
        }.to raise_error(Services::TwilioClient::ConfigurationError, /TWILIO_ACCOUNT_SID/)
      end

      it 'raises ConfigurationError when auth_token is missing' do
        expect {
          described_class.new(account_sid: account_sid, auth_token: nil, from_number: from_number)
        }.to raise_error(Services::TwilioClient::ConfigurationError, /TWILIO_AUTH_TOKEN/)
      end

      it 'raises ConfigurationError when from_number is missing' do
        expect {
          described_class.new(account_sid: account_sid, auth_token: auth_token, from_number: nil)
        }.to raise_error(Services::TwilioClient::ConfigurationError, /TWILIO_FROM/)
      end
    end

    context 'with environment variables' do
      before do
        ENV['TWILIO_ACCOUNT_SID'] = account_sid
        ENV['TWILIO_AUTH_TOKEN'] = auth_token
        ENV['TWILIO_FROM'] = from_number
      end

      after do
        ENV.delete('TWILIO_ACCOUNT_SID')
        ENV.delete('TWILIO_AUTH_TOKEN')
        ENV.delete('TWILIO_FROM')
      end

      it 'uses environment variables when parameters are not provided' do
        client = described_class.new
        expect(client.from_number).to eq(from_number)
      end
    end
  end

  describe '#make_call' do
    let(:message) { 'Hello, this is a test call.' }
    let(:call_sid) { 'CA_test_call_sid_123' }
    
    let(:mock_call) do
      instance_double(
        'Twilio::REST::Api::V2010::AccountContext::CallInstance',
        sid: call_sid,
        status: 'queued',
        to: to_number,
        from: from_number,
        direction: 'outbound-api'
      )
    end

    before do
      allow(mock_calls).to receive(:create).and_return(mock_call)
    end

    context 'with valid parameters' do
      it 'initiates a call successfully' do
        result = twilio_client.make_call(to: to_number, message: message)

        expect(result).to include(
          sid: call_sid,
          status: 'queued',
          to: to_number,
          from: from_number,
          direction: 'outbound-api'
        )
        expect(result[:estimated_cost]).to be_a(Float)
      end

      it 'calls Twilio API with correct parameters' do
        expect(mock_calls).to receive(:create).with(
          hash_including(
            to: to_number,
            from: from_number,
            timeout: 30,
            record: false
          )
        )

        twilio_client.make_call(to: to_number, message: message)
      end

      it 'accepts custom options' do
        expect(mock_calls).to receive(:create).with(
          hash_including(
            timeout: 60,
            record: true
          )
        )

        twilio_client.make_call(
          to: to_number,
          message: message,
          timeout: 60,
          record: true
        )
      end

      it 'includes status callback configuration' do
        callback_url = 'https://example.com/webhook'
        
        expect(mock_calls).to receive(:create).with(
          hash_including(
            status_callback: callback_url,
            status_callback_event: ['initiated', 'ringing', 'answered', 'completed'],
            status_callback_method: 'POST'
          )
        )

        twilio_client.make_call(
          to: to_number,
          message: message,
          status_callback: callback_url
        )
      end
    end

    context 'with invalid phone number' do
      it 'raises CallError for invalid format' do
        expect {
          twilio_client.make_call(to: 'invalid', message: message)
        }.to raise_error(Services::TwilioClient::CallError, /Invalid phone number format/)
      end

      it 'raises CallError for empty phone number' do
        expect {
          twilio_client.make_call(to: '', message: message)
        }.to raise_error(Services::TwilioClient::CallError, /Invalid phone number format/)
      end
    end

    context 'when Twilio API fails' do
      before do
        allow(mock_calls).to receive(:create).and_raise(
          Twilio::REST::RestError.new('Invalid phone number', 400)
        )
      end

      it 'raises CallError with descriptive message' do
        expect {
          twilio_client.make_call(to: to_number, message: message)
        }.to raise_error(Services::TwilioClient::CallError, /Failed to initiate call/)
      end
    end
  end

  describe '#get_call_status' do
    let(:call_sid) { 'CA_test_call_sid_123' }
    let(:start_time) { Time.parse('2024-01-01 10:00:00 UTC') }
    let(:end_time) { Time.parse('2024-01-01 10:05:00 UTC') }
    
    let(:mock_call) do
      instance_double(
        'Twilio::REST::Api::V2010::AccountContext::CallInstance',
        sid: call_sid,
        status: 'completed',
        duration: '300',
        start_time: start_time,
        end_time: end_time,
        price: '-0.065',
        price_unit: 'USD'
      )
    end

    before do
      allow(mock_twilio_client).to receive(:calls).with(call_sid).and_return(mock_call_context)
      allow(mock_call_context).to receive(:fetch).and_return(mock_call)
    end

    it 'fetches call status successfully' do
      result = twilio_client.get_call_status(call_sid)

      expect(result).to include(
        sid: call_sid,
        status: 'completed',
        duration: 300,
        start_time: start_time,
        end_time: end_time,
        price: 0.065,
        price_unit: 'USD'
      )
    end

    it 'handles nil price gracefully' do
      allow(mock_call).to receive(:price).and_return(nil)
      
      result = twilio_client.get_call_status(call_sid)
      expect(result[:price]).to eq(0.0)
    end

    context 'when Twilio API fails' do
      before do
        allow(mock_call_context).to receive(:fetch).and_raise(
          Twilio::REST::RestError.new('Call not found', 404)
        )
      end

      it 'raises CallError' do
        expect {
          twilio_client.get_call_status(call_sid)
        }.to raise_error(Services::TwilioClient::CallError, /Failed to fetch call status/)
      end
    end
  end

  describe '#update_call' do
    let(:call_sid) { 'CA_test_call_sid_123' }

    before do
      allow(mock_twilio_client).to receive(:calls).with(call_sid).and_return(mock_call_context)
      allow(mock_call_context).to receive(:update)
    end

    it 'updates call status successfully' do
      expect(mock_call_context).to receive(:update).with(status: 'completed')
      twilio_client.update_call(call_sid, status: 'completed')
    end

    context 'when Twilio API fails' do
      before do
        allow(mock_call_context).to receive(:update).and_raise(
          Twilio::REST::RestError.new('Cannot update call', 400)
        )
      end

      it 'raises CallError' do
        expect {
          twilio_client.update_call(call_sid, status: 'completed')
        }.to raise_error(Services::TwilioClient::CallError, /Failed to update call/)
      end
    end
  end

  describe '#cancel_call' do
    let(:call_sid) { 'CA_test_call_sid_123' }

    before do
      allow(mock_twilio_client).to receive(:calls).with(call_sid).and_return(mock_call_context)
      allow(mock_call_context).to receive(:update)
    end

    it 'cancels call by updating status to canceled' do
      expect(mock_call_context).to receive(:update).with(status: 'canceled')
      twilio_client.cancel_call(call_sid)
    end
  end

  describe '#estimate_call_cost' do
    it 'returns US/Canada rate for +1 numbers' do
      cost = twilio_client.estimate_call_cost('+18005551234')
      expect(cost).to eq(0.013)
    end

    it 'returns international rate for non-US numbers' do
      cost = twilio_client.estimate_call_cost('+447700900123')
      expect(cost).to eq(0.05)
    end
  end

  describe '#generate_twiml' do
    it 'generates valid TwiML for simple message' do
      twiml = twilio_client.generate_twiml('Hello World')
      
      expect(twiml).to include('<?xml version="1.0" encoding="UTF-8"?>')
      expect(twiml).to include('<Response>')
      expect(twiml).to include('<Say voice="alice" language="en-US">Hello World</Say>')
      expect(twiml).to include('</Response>')
    end

    it 'escapes XML special characters' do
      twiml = twilio_client.generate_twiml('Hello <World> & "Friends"')
      
      expect(twiml).to include('Hello &lt;World&gt; &amp; &quot;Friends&quot;')
    end

    it 'accepts custom voice option' do
      twiml = twilio_client.generate_twiml('Hello', voice: 'man')
      expect(twiml).to include('voice="man"')
    end

    it 'accepts custom language option' do
      twiml = twilio_client.generate_twiml('Hola', language: 'es-ES')
      expect(twiml).to include('language="es-ES"')
    end
  end

  describe '#log_call' do
    it 'logs call data to Rails logger' do
      call_data = { sid: 'CA123', status: 'completed' }
      
      expect(Rails.logger).to receive(:info).with(/TwilioClient.*CA123/)
      twilio_client.log_call(call_data)
    end
  end
end
