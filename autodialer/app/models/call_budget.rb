# frozen_string_literal: true

# CallBudget tracks spending limits for call campaigns
# Provides daily and monthly budget controls to prevent overspending
class CallBudget < ApplicationRecord
  # Validations
  validates :name, presence: true, uniqueness: true
  validates :daily_limit, numericality: { greater_than_or_equal_to: 0 }
  validates :monthly_limit, numericality: { greater_than_or_equal_to: 0 }
  validates :current_daily_spend, numericality: { greater_than_or_equal_to: 0 }
  validates :current_monthly_spend, numericality: { greater_than_or_equal_to: 0 }

  # Callbacks
  before_validation :initialize_defaults, on: :create
  before_save :reset_if_needed

  # Get or create the default budget
  # @return [CallBudget]
  def self.default
    find_or_create_by(name: 'default') do |budget|
      budget.daily_limit = 10.0
      budget.monthly_limit = 100.0
      budget.current_daily_spend = 0.0
      budget.current_monthly_spend = 0.0
      budget.last_reset_date = Date.today
    end
  end

  # Check if a call cost would exceed budget limits
  # @param cost [Float] The estimated call cost
  # @return [Boolean]
  def can_afford?(cost)
    return true if daily_limit.zero? && monthly_limit.zero? # No limits set
    
    within_daily = daily_limit.zero? || (current_daily_spend + cost) <= daily_limit
    within_monthly = monthly_limit.zero? || (current_monthly_spend + cost) <= monthly_limit
    
    within_daily && within_monthly
  end

  # Add a call cost to the budget
  # @param cost [Float] The call cost to add
  # @return [Boolean] Success status
  def add_spend(cost)
    reset_if_needed
    
    self.current_daily_spend += cost
    self.current_monthly_spend += cost
    save
  end

  # Check if daily budget is exceeded
  # @return [Boolean]
  def daily_exceeded?
    return false if daily_limit.zero?
    current_daily_spend >= daily_limit
  end

  # Check if monthly budget is exceeded
  # @return [Boolean]
  def monthly_exceeded?
    return false if monthly_limit.zero?
    current_monthly_spend >= monthly_limit
  end

  # Get remaining daily budget
  # @return [Float]
  def daily_remaining
    return Float::INFINITY if daily_limit.zero?
    [daily_limit - current_daily_spend, 0].max
  end

  # Get remaining monthly budget
  # @return [Float]
  def monthly_remaining
    return Float::INFINITY if monthly_limit.zero?
    [monthly_limit - current_monthly_spend, 0].max
  end

  # Reset daily spend if it's a new day
  # Reset monthly spend if it's a new month
  def reset_if_needed
    return if last_reset_date == Date.today
    
    if last_reset_date.nil? || last_reset_date < Date.today
      self.current_daily_spend = 0.0
      self.last_reset_date = Date.today
    end
    
    if last_reset_date.nil? || last_reset_date.month != Date.today.month
      self.current_monthly_spend = 0.0
    end
  end

  private

  def initialize_defaults
    self.current_daily_spend ||= 0.0
    self.current_monthly_spend ||= 0.0
    self.last_reset_date ||= Date.today
  end
end
