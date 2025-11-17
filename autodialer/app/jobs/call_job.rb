# frozen_string_literal: true

# CallJob handles asynchronous call processing using ActiveJob
# It processes calls sequentially and includes retry logic for transient failures
class CallJob < ApplicationJob
  queue_as :default

  # Retry on transient Twilio errors with exponential backoff
  retry_on Services::TwilioClient::CallError, wait: :exponentially_longer, attempts: 3

  # Discard job if the call record is deleted
  discard_on ActiveJob::DeserializationError

  # Process a call asynchronously
  # @param call_id [Integer] The ID of the Call record to process
  def perform(call_id)
    call = Call.find(call_id)
    
    # Skip if call is already processed or canceled
    return if call.completed? || call.failed? || call.canceled?

    # Mark call as queued
    call.update!(status: :queued)

    # Initialize Twilio client
    twilio_client = Services::TwilioClient.new

    # Prepare call message
    message = call.message || default_message(call.contact)

    # Check budget before making call
    budget = CallBudget.default
    estimated_cost = twilio_client.estimate_call_cost(call.contact.phone_number)
    
    unless budget.can_afford?(estimated_cost)
      handle_budget_exceeded(call, budget)
      return
    end

    # Mark call as in progress before making the call
    call.update!(status: :in_progress, started_at: Time.current)

    # Make the call
    result = twilio_client.make_call(
      to: call.contact.phone_number,
      message: message,
      status_callback: status_callback_url(call),
      timeout: 30
    )

    # Update call with Twilio SID and initial status
    call.update!(
      twilio_sid: result[:sid],
      cost: result[:estimated_cost]
    )

    # Add cost to budget
    budget.add_spend(result[:estimated_cost])

    # Log successful call initiation
    Rails.logger.info("[CallJob] Call initiated successfully: Call ID #{call.id}, Twilio SID #{result[:sid]}")

  rescue Services::TwilioClient::CallError => e
    # Handle Twilio-specific errors
    handle_call_error(call, e)
    raise # Re-raise to trigger retry logic
    
  rescue StandardError => e
    # Handle unexpected errors
    handle_unexpected_error(call, e)
    raise
  end

  private

  def default_message(contact)
    name = contact.name.presence || "there"
    "Hello #{name}, this is an automated call from our system. Thank you for your time."
  end

  def status_callback_url(call)
    # Generate callback URL for Twilio to post status updates
    # This assumes a TwilioController with a status_callback action
    return nil unless ENV['APP_BASE_URL'].present?
    
    "#{ENV['APP_BASE_URL']}/twilio/status_callback/#{call.id}"
  end

  def handle_call_error(call, error)
    error_message = "Twilio error: #{error.message}"
    
    call.update(
      status: :failed,
      ended_at: Time.current,
      error_message: error_message
    )

    Rails.logger.error("[CallJob] Call failed: Call ID #{call.id}, Error: #{error_message}")
  end

  def handle_unexpected_error(call, error)
    error_message = "Unexpected error: #{error.class} - #{error.message}"
    
    call.update(
      status: :failed,
      ended_at: Time.current,
      error_message: error_message
    )

    Rails.logger.error("[CallJob] Unexpected error: Call ID #{call.id}, Error: #{error_message}")
    Rails.logger.error(error.backtrace.join("\n"))
  end

  def handle_budget_exceeded(call, budget)
    error_message = if budget.daily_exceeded?
                      "Daily budget exceeded: $#{budget.current_daily_spend}/$#{budget.daily_limit}"
                    elsif budget.monthly_exceeded?
                      "Monthly budget exceeded: $#{budget.current_monthly_spend}/$#{budget.monthly_limit}"
                    else
                      "Budget limit would be exceeded by this call"
                    end
    
    call.update(
      status: :failed,
      ended_at: Time.current,
      error_message: error_message
    )

    Rails.logger.warn("[CallJob] Budget exceeded: Call ID #{call.id}, #{error_message}")
  end
end
