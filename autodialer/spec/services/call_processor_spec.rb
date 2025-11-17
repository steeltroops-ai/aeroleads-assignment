# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CallProcessor do
  let(:contact1) { Contact.create!(phone_number: '+18005551111', name: 'User 1') }
  let(:contact2) { Contact.create!(phone_number: '+18005552222', name: 'User 2') }
  let(:contact3) { Contact.create!(phone_number: '+18005553333', name: 'User 3') }
  
  let(:call1) { Call.create!(contact: contact1, status: :pending, message: 'Message 1') }
  let(:call2) { Call.create!(contact: contact2, status: :pending, message: 'Message 2') }
  let(:call3) { Call.create!(contact: contact3, status: :pending, message: 'Message 3') }
  
  let(:calls) { [call1, call2, call3] }
  let(:processor) { described_class.new(calls) }

  describe '#initialize' do
    it 'accepts an array of calls' do
      expect(processor.calls).to eq(calls)
    end

    it 'accepts a single call' do
      single_processor = described_class.new(call1)
      expect(single_processor.calls).to eq([call1])
    end

    it 'accepts options' do
      processor_with_options = described_class.new(calls, delay: 5)
      expect(processor_with_options.options).to eq({ delay: 5 })
    end
  end

  describe '#enqueue_all' do
    it 'enqueues all calls' do
      expect(CallJob).to receive(:perform_later).exactly(3).times
      processor.enqueue_all
    end

    it 'returns array of jobs' do
      jobs = processor.enqueue_all
      expect(jobs).to be_an(Array)
      expect(jobs.size).to eq(3)
    end

    context 'with delay' do
      it 'enqueues calls with sequential delays' do
        expect(CallJob).to receive(:perform_later).with(call1.id).once
        expect(CallJob).to receive(:set).with(wait: 5.seconds).and_return(CallJob).once
        expect(CallJob).to receive(:set).with(wait: 10.seconds).and_return(CallJob).once
        expect(CallJob).to receive(:perform_later).with(call2.id).once
        expect(CallJob).to receive(:perform_later).with(call3.id).once
        
        processor.enqueue_all(delay: 5)
      end
    end

    context 'with no delay' do
      it 'enqueues all calls immediately' do
        expect(CallJob).to receive(:perform_later).exactly(3).times
        expect(CallJob).not_to receive(:set)
        
        processor.enqueue_all(delay: 0)
      end
    end
  end

  describe '#process_all_now' do
    let(:twilio_client) { instance_double(Services::TwilioClient) }
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
      allow(Services::TwilioClient).to receive(:new).and_return(twilio_client)
      allow(twilio_client).to receive(:make_call).and_return(twilio_response)
    end

    it 'processes all calls immediately' do
      expect(CallJob).to receive(:perform_now).with(call1.id).once
      expect(CallJob).to receive(:perform_now).with(call2.id).once
      expect(CallJob).to receive(:perform_now).with(call3.id).once
      
      processor.process_all_now
    end

    it 'returns reloaded calls' do
      result = processor.process_all_now
      expect(result).to eq(calls)
      expect(result.first).to be_a(Call)
    end
  end

  describe '.create_and_enqueue' do
    let(:contact_ids) { [contact1.id, contact2.id, contact3.id] }
    let(:message) { 'Batch message' }

    it 'creates calls for all contact IDs' do
      expect {
        described_class.create_and_enqueue(contact_ids, message: message)
      }.to change(Call, :count).by(3)
    end

    it 'sets the message for all calls' do
      calls = described_class.create_and_enqueue(contact_ids, message: message)
      expect(calls.map(&:message).uniq).to eq([message])
    end

    it 'sets status to pending for all calls' do
      calls = described_class.create_and_enqueue(contact_ids, message: message)
      expect(calls.map(&:status).uniq).to eq(['pending'])
    end

    it 'enqueues all created calls' do
      expect(CallJob).to receive(:perform_later).exactly(3).times
      described_class.create_and_enqueue(contact_ids, message: message)
    end

    it 'returns created calls' do
      calls = described_class.create_and_enqueue(contact_ids, message: message)
      expect(calls).to be_an(Array)
      expect(calls.size).to eq(3)
      expect(calls.first).to be_a(Call)
    end

    context 'with delay' do
      it 'enqueues calls with delay' do
        expect(CallJob).to receive(:perform_later).once
        expect(CallJob).to receive(:set).with(wait: 10.seconds).and_return(CallJob).twice
        expect(CallJob).to receive(:perform_later).twice
        
        described_class.create_and_enqueue(contact_ids, message: message, delay: 10)
      end
    end
  end

  describe '#statistics' do
    before do
      call1.update!(status: :completed)
      call2.update!(status: :failed)
      call3.update!(status: :pending)
    end

    it 'returns statistics hash' do
      stats = processor.statistics
      
      expect(stats[:total]).to eq(3)
      expect(stats[:completed]).to eq(1)
      expect(stats[:failed]).to eq(1)
      expect(stats[:pending]).to eq(1)
    end

    it 'counts all status types' do
      stats = processor.statistics
      
      expect(stats).to have_key(:total)
      expect(stats).to have_key(:pending)
      expect(stats).to have_key(:queued)
      expect(stats).to have_key(:in_progress)
      expect(stats).to have_key(:completed)
      expect(stats).to have_key(:failed)
      expect(stats).to have_key(:canceled)
    end

    context 'with mixed failure statuses' do
      before do
        call1.update!(status: :failed)
        call2.update!(status: :no_answer)
        call3.update!(status: :busy)
      end

      it 'groups all failure types together' do
        stats = processor.statistics
        expect(stats[:failed]).to eq(3)
      end
    end
  end
end
