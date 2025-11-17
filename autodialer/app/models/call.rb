class Call < ApplicationRecord
  # Associations
  belongs_to :contact

  # Enums
  enum :status, {
    pending: 0,
    queued: 1,
    in_progress: 2,
    completed: 3,
    failed: 4,
    no_answer: 5,
    busy: 6,
    canceled: 7
  }, default: :pending

  # Validations
  validates :status, presence: true
  validates :duration, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :cost, numericality: { greater_than_or_equal_to: 0, allow_nil: true }
  validates :twilio_sid, uniqueness: { allow_nil: true }

  # Callbacks
  before_create :set_started_at_if_in_progress

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :successful, -> { where(status: :completed) }
  scope :failed_calls, -> { where(status: [:failed, :no_answer, :busy]) }
  scope :by_contact, ->(contact_id) { where(contact_id: contact_id) }
  scope :scheduled, -> { where.not(scheduled_at: nil).where("scheduled_at > ?", Time.current) }
  scope :ready_to_call, -> { where(status: :pending).where("scheduled_at IS NULL OR scheduled_at <= ?", Time.current) }
  scope :with_recording, -> { where.not(recording_url: nil) }

  # Instance methods
  def calculate_cost
    return 0 if duration.nil? || duration.zero?
    # Twilio pricing: approximately $0.013 per minute for US calls
    # This is a simplified calculation
    (duration / 60.0 * 0.013).round(4)
  end

  def mark_completed(duration_seconds)
    update(
      status: :completed,
      duration: duration_seconds,
      ended_at: Time.current,
      cost: calculate_cost_for_duration(duration_seconds)
    )
  end

  def mark_failed(error)
    update(
      status: :failed,
      ended_at: Time.current,
      error_message: error
    )
  end

  # Enqueue this call for asynchronous processing
  def enqueue_call
    if scheduled_at.present? && scheduled_at > Time.current
      # Schedule for future execution
      CallJob.set(wait_until: scheduled_at).perform_later(id)
    else
      # Execute immediately
      CallJob.perform_later(id)
    end
  end

  # Enqueue this call for immediate processing (for testing)
  def process_call_now
    CallJob.perform_now(id)
  end

  # Check if call is scheduled for future
  def scheduled?
    scheduled_at.present? && scheduled_at > Time.current
  end

  # Check if call has recording
  def has_recording?
    recording_url.present?
  end

  # Get recording details
  def recording_info
    return nil unless has_recording?
    
    {
      url: recording_url,
      duration: recording_duration,
      available: recording_available?
    }
  end

  # Check if recording is available for playback
  def recording_available?
    has_recording? && recording_url.present?
  end

  private

  def set_started_at_if_in_progress
    self.started_at = Time.current if in_progress?
  end

  def calculate_cost_for_duration(duration_seconds)
    return 0 if duration_seconds.nil? || duration_seconds.zero?
    (duration_seconds / 60.0 * 0.013).round(4)
  end
end
