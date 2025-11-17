require 'rails_helper'

RSpec.describe Contact, type: :model do
  describe 'associations' do
    it { is_expected.to have_many(:calls).dependent(:destroy) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:phone_number) }
    
    it 'validates phone number format' do
      contact = Contact.new(phone_number: 'invalid')
      expect(contact).not_to be_valid
      expect(contact.errors[:phone_number]).to include('must be a valid E.164 format phone number')
    end

    it 'accepts valid E.164 phone numbers' do
      valid_numbers = ['+12025551234', '+442071234567', '+919876543210', '12025551234']
      valid_numbers.each do |number|
        contact = Contact.new(phone_number: number)
        contact.valid?
        expect(contact.errors[:phone_number]).to be_empty, "Expected #{number} to be valid"
      end
    end

    it 'validates name length' do
      contact = Contact.new(phone_number: '+12025551234', name: 'a' * 256)
      expect(contact).not_to be_valid
      expect(contact.errors[:name]).to be_present
    end

    it 'validates email format when present' do
      contact = Contact.new(phone_number: '+12025551234', email: 'invalid-email')
      expect(contact).not_to be_valid
      expect(contact.errors[:email]).to be_present
    end

    it 'allows blank email' do
      contact = Contact.new(phone_number: '+12025551234', email: '')
      contact.valid?
      expect(contact.errors[:email]).to be_empty
    end

    it 'accepts valid email addresses' do
      contact = Contact.new(phone_number: '+12025551234', email: 'test@example.com')
      contact.valid?
      expect(contact.errors[:email]).to be_empty
    end
  end

  describe 'callbacks' do
    it 'normalizes phone number before validation' do
      contact = Contact.create(phone_number: '+1 (202) 555-1234')
      expect(contact.phone_number).to eq('+12025551234')
    end

    it 'removes spaces from phone number' do
      contact = Contact.create(phone_number: '+1 202 555 1234')
      expect(contact.phone_number).to eq('+12025551234')
    end

    it 'removes dashes from phone number' do
      contact = Contact.create(phone_number: '+1-202-555-1234')
      expect(contact.phone_number).to eq('+12025551234')
    end
  end

  describe 'scopes' do
    let!(:old_contact) { Contact.create(phone_number: '+12025551234', created_at: 2.days.ago) }
    let!(:new_contact) { Contact.create(phone_number: '+12025551235', created_at: 1.day.ago) }

    it 'orders by most recent first' do
      expect(Contact.recent.first).to eq(new_contact)
      expect(Contact.recent.last).to eq(old_contact)
    end
  end

  describe 'dependent destroy' do
    it 'destroys associated calls when contact is destroyed' do
      contact = Contact.create(phone_number: '+12025551234')
      call = contact.calls.create(status: :pending)
      
      expect { contact.destroy }.to change { Call.count }.by(-1)
    end
  end

  describe 'toll-free number detection' do
    it 'identifies US toll-free numbers with +1 prefix' do
      toll_free_prefixes = %w[800 888 877 866 855 844 833]
      toll_free_prefixes.each do |prefix|
        contact = Contact.new(phone_number: "+1#{prefix}5551234")
        expect(contact.toll_free?).to be true, "Expected +1#{prefix}5551234 to be toll-free"
      end
    end

    it 'identifies toll-free numbers without +1 prefix' do
      contact = Contact.new(phone_number: '8005551234')
      expect(contact.toll_free?).to be true
    end

    it 'identifies non-toll-free numbers' do
      contact = Contact.new(phone_number: '+12025551234')
      expect(contact.toll_free?).to be false
    end

    it 'handles formatted toll-free numbers' do
      contact = Contact.new(phone_number: '+1 (800) 555-1234')
      expect(contact.toll_free?).to be true
    end
  end

  describe 'development mode safety' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('development'))
      ENV['ALLOW_REAL_CALLS'] = nil
    end

    it 'allows toll-free numbers in development' do
      contact = Contact.new(phone_number: '+18005551234', name: 'Test')
      expect(contact).to be_valid
    end

    it 'rejects non-toll-free numbers in development' do
      contact = Contact.new(phone_number: '+12025551234', name: 'Test')
      expect(contact).not_to be_valid
      expect(contact.errors[:phone_number]).to include(/must be a toll-free number/)
    end

    it 'allows non-toll-free numbers when ALLOW_REAL_CALLS is set' do
      ENV['ALLOW_REAL_CALLS'] = 'true'
      contact = Contact.new(phone_number: '+12025551234', name: 'Test')
      expect(contact).to be_valid
    end

    it 'allows all numbers in production' do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
      contact = Contact.new(phone_number: '+12025551234', name: 'Test')
      expect(contact).to be_valid
    end
  end

  describe 'scopes' do
    before do
      ENV['ALLOW_REAL_CALLS'] = 'true'
      Contact.create(phone_number: '+18005551234', name: 'Toll Free 1')
      Contact.create(phone_number: '+18885551234', name: 'Toll Free 2')
      Contact.create(phone_number: '+12025551234', name: 'Regular')
    end

    it 'filters toll-free contacts' do
      expect(Contact.toll_free.count).to eq(2)
    end

    it 'safe_for_testing returns toll-free numbers' do
      expect(Contact.safe_for_testing.count).to eq(2)
    end
  end
end
