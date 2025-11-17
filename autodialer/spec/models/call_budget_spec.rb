# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CallBudget, type: :model do
  describe 'validations' do
    it 'validates presence of name' do
      budget = CallBudget.new(name: nil)
      expect(budget).not_to be_valid
      expect(budget.errors[:name]).to include("can't be blank")
    end

    it 'validates uniqueness of name' do
      CallBudget.create!(name: 'test', daily_limit: 10.0, monthly_limit: 100.0)
      budget = CallBudget.new(name: 'test')
      expect(budget).not_to be_valid
      expect(budget.errors[:name]).to include('has already been taken')
    end

    it 'validates daily_limit is non-negative' do
      budget = CallBudget.new(name: 'test', daily_limit: -1.0)
      expect(budget).not_to be_valid
    end

    it 'validates monthly_limit is non-negative' do
      budget = CallBudget.new(name: 'test', monthly_limit: -1.0)
      expect(budget).not_to be_valid
    end
  end

  describe '.default' do
    it 'creates a default budget if it does not exist' do
      expect(CallBudget.count).to eq(0)
      budget = CallBudget.default
      expect(budget).to be_persisted
      expect(budget.name).to eq('default')
      expect(budget.daily_limit).to eq(10.0)
      expect(budget.monthly_limit).to eq(100.0)
    end

    it 'returns existing default budget' do
      existing = CallBudget.create!(name: 'default', daily_limit: 20.0, monthly_limit: 200.0)
      budget = CallBudget.default
      expect(budget.id).to eq(existing.id)
      expect(budget.daily_limit).to eq(20.0)
    end
  end

  describe '#can_afford?' do
    let(:budget) do
      CallBudget.create!(
        name: 'test',
        daily_limit: 10.0,
        monthly_limit: 100.0,
        current_daily_spend: 5.0,
        current_monthly_spend: 50.0
      )
    end

    it 'returns true when cost is within both limits' do
      expect(budget.can_afford?(3.0)).to be true
    end

    it 'returns false when cost exceeds daily limit' do
      expect(budget.can_afford?(6.0)).to be false
    end

    it 'returns false when cost exceeds monthly limit' do
      expect(budget.can_afford?(51.0)).to be false
    end

    it 'returns true when limits are zero (unlimited)' do
      budget.update!(daily_limit: 0.0, monthly_limit: 0.0)
      expect(budget.can_afford?(1000.0)).to be true
    end
  end

  describe '#add_spend' do
    let(:budget) do
      CallBudget.create!(
        name: 'test',
        daily_limit: 10.0,
        monthly_limit: 100.0,
        current_daily_spend: 5.0,
        current_monthly_spend: 50.0,
        last_reset_date: Date.today
      )
    end

    it 'adds cost to both daily and monthly spend' do
      budget.add_spend(2.0)
      expect(budget.current_daily_spend).to eq(7.0)
      expect(budget.current_monthly_spend).to eq(52.0)
    end

    it 'persists the changes' do
      budget.add_spend(2.0)
      budget.reload
      expect(budget.current_daily_spend).to eq(7.0)
    end
  end

  describe '#daily_exceeded?' do
    it 'returns true when daily spend equals or exceeds limit' do
      budget = CallBudget.create!(name: 'test', daily_limit: 10.0, current_daily_spend: 10.0)
      expect(budget.daily_exceeded?).to be true
    end

    it 'returns false when daily spend is below limit' do
      budget = CallBudget.create!(name: 'test', daily_limit: 10.0, current_daily_spend: 5.0)
      expect(budget.daily_exceeded?).to be false
    end

    it 'returns false when daily limit is zero (unlimited)' do
      budget = CallBudget.create!(name: 'test', daily_limit: 0.0, current_daily_spend: 100.0)
      expect(budget.daily_exceeded?).to be false
    end
  end

  describe '#monthly_exceeded?' do
    it 'returns true when monthly spend equals or exceeds limit' do
      budget = CallBudget.create!(name: 'test', monthly_limit: 100.0, current_monthly_spend: 100.0)
      expect(budget.monthly_exceeded?).to be true
    end

    it 'returns false when monthly spend is below limit' do
      budget = CallBudget.create!(name: 'test', monthly_limit: 100.0, current_monthly_spend: 50.0)
      expect(budget.monthly_exceeded?).to be false
    end
  end

  describe '#daily_remaining' do
    it 'returns remaining daily budget' do
      budget = CallBudget.create!(name: 'test', daily_limit: 10.0, current_daily_spend: 3.0)
      expect(budget.daily_remaining).to eq(7.0)
    end

    it 'returns infinity when daily limit is zero' do
      budget = CallBudget.create!(name: 'test', daily_limit: 0.0)
      expect(budget.daily_remaining).to eq(Float::INFINITY)
    end

    it 'returns zero when budget is exceeded' do
      budget = CallBudget.create!(name: 'test', daily_limit: 10.0, current_daily_spend: 15.0)
      expect(budget.daily_remaining).to eq(0.0)
    end
  end

  describe '#reset_if_needed' do
    it 'resets daily spend on a new day' do
      budget = CallBudget.create!(
        name: 'test',
        current_daily_spend: 10.0,
        current_monthly_spend: 50.0,
        last_reset_date: Date.yesterday
      )
      budget.reset_if_needed
      expect(budget.current_daily_spend).to eq(0.0)
      expect(budget.last_reset_date).to eq(Date.today)
    end

    it 'resets monthly spend on a new month' do
      budget = CallBudget.create!(
        name: 'test',
        current_daily_spend: 10.0,
        current_monthly_spend: 50.0,
        last_reset_date: Date.today.prev_month
      )
      budget.reset_if_needed
      expect(budget.current_monthly_spend).to eq(0.0)
    end

    it 'does not reset on the same day' do
      budget = CallBudget.create!(
        name: 'test',
        current_daily_spend: 10.0,
        last_reset_date: Date.today
      )
      budget.reset_if_needed
      expect(budget.current_daily_spend).to eq(10.0)
    end
  end
end
