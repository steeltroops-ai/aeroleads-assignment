# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CallJob, type: :job do
  let(:contact) { Contact.create!(phone_number: '+18005551234', name: 'Test User') }
  let(:call) { Call.create!(contact: contact, status: :pending, message: 'Test message') }
  let(:twilio_client) { instance_double(Services::TwilioClient) }
  
  before do
    allow(Services::TwilioClient).to receive(:new).and_return(twilio_client)
  end

  describe '#perform' do
    context 'when call is successful' do
      let(:twilio_response) do
        {
          sid: 'CA1234567890abcdef',
          status: 'queued',
          to: '+18005551234',
          from: '+18005559999',
          direction: 'outbound-api',
          estimated_cost: 0.013
        }
      end

      before do
        allow(twilio_client).to receive(:make_call).and_return(twilio_response)
      end

      it 'updates call status to queued' do
        CallJob.perform_now(call.id)
        call.reload
        expect(call.status).to eq('in_progress')
      end

      it 'makes a call through Twilio client' do
        expect(twilio_client).to receive(:make_call).with(
          hash_including(
            to: '+18005551234',
            message: 'Test message'
          )
        )
        CallJob.perform_now(call.id)
      end

      it 'updates call with Twilio SID' do
        CallJob.perform_now(call.id)
        call.reload
        expect(call.twilio_sid).to eq('CA1234567890abcdef')
      end

      it 'updates call with estimated cost' do
        CallJob.perform_now(call.id)
        call.reload
        expect(call.cost).to eq(0.013)
      end

      it 'sets started_at timestamp' do
        CallJob.perform_now(call.id)
        call.reload
        expect(call.started_at).to be_present
      end
    end

    context 'when call has no custom message' do
      let(:call_without_message) { Call.create!(contact: contact, status: :pending) }
      let(:twilio_response) do
        {
          sid: 'CA1234567890abcdef',
          status: 'queued',
          to: '+18005551234',
          from: '+18005559999',
          direction: 'outbound-api',
          estimated_cost: 0.013
        }
      end

      before do
        allow(twilio_client).to receive(:make_call).and_return(twilio_response)
      end

      it 'uses default message with contact name' do
        expect(twilio_client).to receive(:make_call).with(
          hash_including(
            message: 'Hello Test User, this is an automated call from our system. Thank you for your time.'
          )
        )
        CallJob.perform_now(call_without_message.id)
      end
    end

    context 'when contact has no name' do
      let(:contact_no_name) { Contact.create!(phone_number: '+18005551234') }
      let(:call_no_name) { Call.create!(contact: contact_no_name, status: :pending) }
      let(:twilio_response) do
        {
          sid: 'CA1234567890abcdef',
          status: 'queued',
          to: '+18005551234',
          from: '+18005559999',
          direction: 'outbound-api',
          estimated_cost: 0.013
        }
      end

      before do
        allow(twilio_client).to receive(:make_call).and_return(twilio_response)
      end

      it 'uses default message with "there"' do
        expect(twilio_client).to receive(:make_call).with(
          hash_including(
            message: 'Hello there, this is an automated call from our system. Thank you for your time.'
          )
        )
        CallJob.perform_now(call_no_name.id)
      end
    end

    context 'when call is already completed' do
      before do
        call.update!(status: :completed)
      end

      it 'does not make a call' do
        expect(twilio_client).not_to receive(:make_call)
        CallJob.perform_now(call.id)
      end

      it 'does not change call status' do
        expect { CallJob.perform_now(call.id) }.not_to change { call.reload.status }
      end
    end

    context 'when call is already failed' do
      before do
        call.update!(status: :failed)
      end

      it 'does not make a call' do
        expect(twilio_client).not_to receive(:make_call)
        CallJob.perform_now(call.id)
      end
    end

    context 'when call is canceled' do
      before do
        call.update!(status: :canceled)
      end

      it 'does not make a call' do
        expect(twilio_client).not_to receive(:make_call)
        CallJob.perform_now(call.id)
      end
    end

    context 'when Twilio API fails' do
      before do
        allow(twilio_client).to receive(:make_call)
          .and_raise(Services::TwilioClient::CallError.new('API error'))
      end

      it 'marks call as failed' do
        expect { CallJob.perform_now(call.id) }.to raise_error(Services::TwilioClient::CallError)
        call.reload
        expect(call.status).to eq('failed')
      end

      it 'records error message' do
        expect { CallJob.perform_now(call.id) }.to raise_error(Services::TwilioClient::CallError)
        call.reload
        expect(call.error_message).to include('Twilio error')
      end

      it 'sets ended_at timestamp' do
        expect { CallJob.perform_now(call.id) }.to raise_error(Services::TwilioClient::CallError)
        call.reload
        expect(call.ended_at).to be_present
      end
    end

    context 'when an unexpected error occurs' do
      before do
        allow(twilio_client).to receive(:make_call)
          .and_raise(StandardError.new('Unexpected error'))
      end

      it 'marks call as failed' do
        expect { CallJob.perform_now(call.id) }.to raise_error(StandardError)
        call.reload
        expect(call.status).to eq('failed')
      end

      it 'records error message with class name' do
        expect { CallJob.perform_now(call.id) }.to raise_error(StandardError)
        call.reload
        expect(call.error_message).to include('Unexpected error')
        expect(call.error_message).to include('StandardError')
      end
    end

    context 'when call record is deleted' do
      it 'discards the job without error' do
        call.destroy
        expect { CallJob.perform_now(call.id) }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end

  describe 'job configuration' do
    it 'is queued on the default queue' do
      expect(CallJob.new.queue_name).to eq('default')
    end

    it 'retries on CallError with exponential backoff' do
      retry_config = CallJob.retry_on_block_for(Services::TwilioClient::CallError)
      expect(retry_config).to be_present
    end
  end

  describe 'sequential processing' do
    let(:contact1) { Contact.create!(phone_number: '+18005551111', name: 'User 1') }
    let(:contact2) { Contact.create!(phone_number: '+18005552222', name: 'User 2') }
    let(:call1) { Call.create!(contact: contact1, status: :pending, message: 'Message 1') }
    let(:call2) { Call.create!(contact: contact2, status: :pending, message: 'Message 2') }
    
    let(:twilio_response1) do
      {
        sid: 'CA1111111111111111',
        status: 'queued',
        to: '+18005551111',
        from: '+18005559999',
        direction: 'outbound-api',
        estimated_cost: 0.013
      }
    end
    
    let(:twilio_response2) do
      {
        sid: 'CA2222222222222222',
        status: 'queued',
        to: '+18005552222',
        from: '+18005559999',
        direction: 'outbound-api',
        estimated_cost: 0.013
      }
    end

    before do
      allow(twilio_client).to receive(:make_call)
        .with(hash_including(to: '+18005551111'))
        .and_return(twilio_response1)
      allow(twilio_client).to receive(:make_call)
        .with(hash_including(to: '+18005552222'))
        .and_return(twilio_response2)
    end

    it 'processes multiple calls sequentially' do
      CallJob.perform_now(call1.id)
      CallJob.perform_now(call2.id)
      
      call1.reload
      call2.reload
      
      expect(call1.twilio_sid).to eq('CA1111111111111111')
      expect(call2.twilio_sid).to eq('CA2222222222222222')
    end
  end

  describe 'status callback URL generation' do
    context 'when APP_BASE_URL is set' do
      before do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('APP_BASE_URL').and_return('https://example.com')
      end

      let(:twilio_response) do
        {
          sid: 'CA1234567890abcdef',
          status: 'queued',
          to: '+18005551234',
          from: '+18005559999',
          direction: 'outbound-api',
          estimated_cost: 0.013
        }
      end

      before do
        allow(twilio_client).to receive(:make_call).and_return(twilio_response)
      end

      it 'includes status callback URL' do
        expect(twilio_client).to receive(:make_call).with(
          hash_including(
            status_callback: "https://example.com/twilio/status_callback/#{call.id}"
          )
        )
        CallJob.perform_now(call.id)
      end
    end

    context 'when APP_BASE_URL is not set' do
      before do
        allow(ENV).to receive(:[]).and_call_original
        allow(ENV).to receive(:[]).with('APP_BASE_URL').and_return(nil)
      end

      let(:twilio_response) do
        {
          sid: 'CA1234567890abcdef',
          status: 'queued',
          to: '+18005551234',
          from: '+18005559999',
          direction: 'outbound-api',
          estimated_cost: 0.013
        }
      end

      before do
        allow(twilio_client).to receive(:make_call).and_return(twilio_response)
      end

      it 'passes nil as status callback' do
        expect(twilio_client).to receive(:make_call).with(
          hash_including(
            status_callback: nil
          )
        )
        CallJob.perform_now(call.id)
      end
    end
  end
end
