require 'rails_helper'

RSpec.describe Call, type: :model do
  let(:contact) { Contact.create(phone_number: '+12025551234') }

  describe 'associations' do
    it { is_expected.to belong_to(:contact) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:status) }

    it 'validates duration is non-negative when present' do
      call = Call.new(contact: contact, duration: -10)
      expect(call).not_to be_valid
      expect(call.errors[:duration]).to be_present
    end

    it 'allows nil duration' do
      call = Call.new(contact: contact, duration: nil)
      call.valid?
      expect(call.errors[:duration]).to be_empty
    end

    it 'validates cost is non-negative when present' do
      call = Call.new(contact: contact, cost: -0.5)
      expect(call).not_to be_valid
      expect(call.errors[:cost]).to be_present
    end

    it 'allows nil cost' do
      call = Call.new(contact: contact, cost: nil)
      call.valid?
      expect(call.errors[:cost]).to be_empty
    end

    it 'validates twilio_sid uniqueness when present' do
      Call.create(contact: contact, twilio_sid: 'CA123456')
      duplicate_call = Call.new(contact: contact, twilio_sid: 'CA123456')
      expect(duplicate_call).not_to be_valid
      expect(duplicate_call.errors[:twilio_sid]).to be_present
    end

    it 'allows nil twilio_sid' do
      call1 = Call.create(contact: contact, twilio_sid: nil)
      call2 = Call.create(contact: contact, twilio_sid: nil)
      expect(call1).to be_valid
      expect(call2).to be_valid
    end
  end

  describe 'enums' do
    it 'defines status enum with correct values' do
      expect(Call.statuses).to eq({
        'pending' => 0,
        'queued' => 1,
        'in_progress' => 2,
        'completed' => 3,
        'failed' => 4,
        'no_answer' => 5,
        'busy' => 6,
        'canceled' => 7
      })
    end

    it 'defaults to pending status' do
      call = Call.new(contact: contact)
      expect(call.status).to eq('pending')
    end

    it 'allows setting status by symbol' do
      call = Call.create(contact: contact, status: :completed)
      expect(call.status).to eq('completed')
    end
  end

  describe 'scopes' do
    let!(:old_call) { Call.create(contact: contact, created_at: 2.days.ago) }
    let!(:new_call) { Call.create(contact: contact, created_at: 1.day.ago) }
    let!(:completed_call) { Call.create(contact: contact, status: :completed) }
    let!(:failed_call) { Call.create(contact: contact, status: :failed) }
    let!(:no_answer_call) { Call.create(contact: contact, status: :no_answer) }

    it 'orders by most recent first' do
      expect(Call.recent.first).to eq(no_answer_call)
    end

    it 'filters successful calls' do
      expect(Call.successful).to include(completed_call)
      expect(Call.successful).not_to include(failed_call)
    end

    it 'filters failed calls' do
      failed_calls = Call.failed_calls
      expect(failed_calls).to include(failed_call, no_answer_call)
      expect(failed_calls).not_to include(completed_call)
    end

    it 'filters by contact' do
      other_contact = Contact.create(phone_number: '+12025551235')
      other_call = Call.create(contact: other_contact)
      
      expect(Call.by_contact(contact.id)).to include(old_call, new_call)
      expect(Call.by_contact(contact.id)).not_to include(other_call)
    end
  end

  describe '#calculate_cost' do
    it 'returns 0 for nil duration' do
      call = Call.new(contact: contact, duration: nil)
      expect(call.calculate_cost).to eq(0)
    end

    it 'returns 0 for zero duration' do
      call = Call.new(contact: contact, duration: 0)
      expect(call.calculate_cost).to eq(0)
    end

    it 'calculates cost based on duration' do
      call = Call.new(contact: contact, duration: 60) # 1 minute
      expect(call.calculate_cost).to eq(0.013)
    end

    it 'calculates cost for partial minutes' do
      call = Call.new(contact: contact, duration: 30) # 30 seconds
      expect(call.calculate_cost).to be_within(0.0001).of(0.0065)
    end
  end

  describe '#mark_completed' do
    it 'updates status to completed' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_completed(120)
      expect(call.status).to eq('completed')
    end

    it 'sets duration' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_completed(120)
      expect(call.duration).to eq(120)
    end

    it 'sets ended_at timestamp' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_completed(120)
      expect(call.ended_at).to be_present
      expect(call.ended_at).to be_within(1.second).of(Time.current)
    end

    it 'calculates and sets cost' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_completed(60)
      expect(call.cost).to eq(0.013)
    end
  end

  describe '#mark_failed' do
    it 'updates status to failed' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_failed('Connection timeout')
      expect(call.status).to eq('failed')
    end

    it 'sets error message' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_failed('Connection timeout')
      expect(call.error_message).to eq('Connection timeout')
    end

    it 'sets ended_at timestamp' do
      call = Call.create(contact: contact, status: :in_progress)
      call.mark_failed('Connection timeout')
      expect(call.ended_at).to be_present
      expect(call.ended_at).to be_within(1.second).of(Time.current)
    end
  end

  describe 'callbacks' do
    it 'sets started_at when status is in_progress on create' do
      call = Call.create(contact: contact, status: :in_progress)
      expect(call.started_at).to be_present
      expect(call.started_at).to be_within(1.second).of(Time.current)
    end

    it 'does not set started_at for pending status' do
      call = Call.create(contact: contact, status: :pending)
      expect(call.started_at).to be_nil
    end
  end
end
