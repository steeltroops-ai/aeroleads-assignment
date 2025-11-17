# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Safety Features Integration', type: :integration do
  before do
    # Set up test environment
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('development'))
    ENV['ALLOW_REAL_CALLS'] = nil
  end

  after do
    ENV['ALLOW_REAL_CALLS'] = nil
  end

  describe 'Toll-free number validation' do
    it 'prevents creating contacts with non-toll-free numbers in development' do
      contact = Contact.new(phone_number: '+12025551234', name: 'Test')
      expect(contact.save).to be false
      expect(contact.errors[:phone_number]).to be_present
    end

    it 'allows creating contacts with toll-free numbers' do
      contact = Contact.new(phone_number: '+18005551234', name: 'Test')
      expect(contact.save).to be true
    end

    it 'can be overridden with environment variable' do
      ENV['ALLOW_REAL_CALLS'] = 'true'
      contact = Contact.new(phone_number: '+12025551234', name: 'Test')
      expect(contact.save).to be true
    end
  end

  describe 'TwilioClient safety checks' do
    let(:twilio_client) { Services::TwilioClient.new }

    before do
      # Mock Twilio client to prevent actual API calls
      allow_any_instance_of(Twilio::REST::Client).to receive(:calls).and_return(
        double(create: double(sid: 'CA123', status: 'queued', to: '+18005551234', from: '+15555551234', direction: 'outbound-api'))
      )
    end

    it 'prevents calls to non-toll-free numbers in development' do
      expect {
        twilio_client.make_call(to: '+12025551234', message: 'Test')
      }.to raise_error(Services::TwilioClient::CallError, /Only toll-free numbers allowed/)
    end

    it 'allows calls to toll-free numbers' do
      result = twilio_client.make_call(to: '+18005551234', message: 'Test')
      expect(result[:sid]).to eq('CA123')
    end

    it 'can skip safety check with option' do
      result = twilio_client.make_call(to: '+12025551234', message: 'Test', skip_safety_check: true)
      expect(result[:sid]).to eq('CA123')
    end
  end

  describe 'Budget controls' do
    let!(:budget) do
      CallBudget.create!(
        name: 'default',
        daily_limit: 1.0,
        monthly_limit: 10.0,
        current_daily_spend: 0.0,
        current_monthly_spend: 0.0,
        last_reset_date: Date.today
      )
    end

    let!(:contact) { Contact.create!(phone_number: '+18005551234', name: 'Test') }

    before do
      # Mock Twilio to prevent actual calls
      allow_any_instance_of(Twilio::REST::Client).to receive(:calls).and_return(
        double(create: double(sid: 'CA123', status: 'queued', to: '+18005551234', from: '+15555551234', direction: 'outbound-api'))
      )
    end

    it 'prevents calls when daily budget is exceeded' do
      budget.update!(current_daily_spend: 1.0)
      
      call = Call.create!(contact: contact, status: :pending, message: 'Test')
      CallJob.perform_now(call.id)
      
      call.reload
      expect(call.status).to eq('failed')
      expect(call.error_message).to include('Daily budget exceeded')
    end

    it 'prevents calls when monthly budget is exceeded' do
      budget.update!(current_monthly_spend: 10.0)
      
      call = Call.create!(contact: contact, status: :pending, message: 'Test')
      CallJob.perform_now(call.id)
      
      call.reload
      expect(call.status).to eq('failed')
      expect(call.error_message).to include('Monthly budget exceeded')
    end

    it 'allows calls within budget and tracks spending' do
      call = Call.create!(contact: contact, status: :pending, message: 'Test')
      CallJob.perform_now(call.id)
      
      call.reload
      budget.reload
      
      expect(call.status).to eq('in_progress')
      expect(budget.current_daily_spend).to be > 0
      expect(budget.current_monthly_spend).to be > 0
    end

    it 'allows unlimited calls when limits are zero' do
      budget.update!(daily_limit: 0.0, monthly_limit: 0.0, current_daily_spend: 100.0)
      
      call = Call.create!(contact: contact, status: :pending, message: 'Test')
      CallJob.perform_now(call.id)
      
      call.reload
      expect(call.status).to eq('in_progress')
    end
  end

  describe 'End-to-end safety workflow' do
    before do
      CallBudget.create!(
        name: 'default',
        daily_limit: 10.0,
        monthly_limit: 100.0,
        current_daily_spend: 0.0,
        current_monthly_spend: 0.0,
        last_reset_date: Date.today
      )

      # Mock Twilio
      allow_any_instance_of(Twilio::REST::Client).to receive(:calls).and_return(
        double(create: double(sid: 'CA123', status: 'queued', to: '+18005551234', from: '+15555551234', direction: 'outbound-api'))
      )
    end

    it 'successfully processes safe toll-free numbers with budget tracking' do
      # Create contact with toll-free number
      contact = Contact.create!(phone_number: '+18005551234', name: 'Safe Test')
      expect(contact).to be_persisted
      expect(contact.toll_free?).to be true

      # Create and process call
      call = Call.create!(contact: contact, status: :pending, message: 'Test message')
      CallJob.perform_now(call.id)

      # Verify call was processed
      call.reload
      expect(call.status).to eq('in_progress')
      expect(call.twilio_sid).to eq('CA123')

      # Verify budget was updated
      budget = CallBudget.default
      expect(budget.current_daily_spend).to be > 0
      expect(budget.current_monthly_spend).to be > 0
    end

    it 'blocks unsafe numbers in development mode' do
      # Attempt to create contact with non-toll-free number
      contact = Contact.new(phone_number: '+12025551234', name: 'Unsafe Test')
      expect(contact.save).to be false
      expect(contact.errors[:phone_number]).to include(/must be a toll-free number/)
    end

    it 'respects budget limits across multiple calls' do
      budget = CallBudget.default
      budget.update!(daily_limit: 0.05) # Very low limit

      contact = Contact.create!(phone_number: '+18005551234', name: 'Test')

      # First call should succeed
      call1 = Call.create!(contact: contact, status: :pending)
      CallJob.perform_now(call1.id)
      call1.reload
      expect(call1.status).to eq('in_progress')

      # Second call should fail due to budget
      call2 = Call.create!(contact: contact, status: :pending)
      CallJob.perform_now(call2.id)
      call2.reload
      expect(call2.status).to eq('failed')
      expect(call2.error_message).to include('budget')
    end
  end

  describe 'Seed data safety' do
    it 'loads seed data with only toll-free numbers' do
      # Clear existing data
      Contact.destroy_all
      CallBudget.destroy_all

      # Load seeds
      load Rails.root.join('db', 'seeds.rb')

      # Verify all contacts are toll-free
      Contact.all.each do |contact|
        expect(contact.toll_free?).to be true, "Contact #{contact.phone_number} should be toll-free"
      end

      # Verify budget was created
      budget = CallBudget.find_by(name: 'default')
      expect(budget).to be_present
      expect(budget.daily_limit).to be > 0
      expect(budget.monthly_limit).to be > 0
    end
  end
end
