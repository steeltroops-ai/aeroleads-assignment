# frozen_string_literal: true

class TwilioController < ApplicationController
  # Skip CSRF verification for Twilio webhooks
  skip_before_action :verify_authenticity_token

  # Generate TwiML for outbound calls
  # POST /twilio/voice
  def voice
    message = params[:message] || "Hello, this is an automated call."
    voice = params[:voice] || "alice"
    language = params[:language] || "en-US"

    response = Twilio::TwiML::VoiceResponse.new do |r|
      r.say(message: message, voice: voice, language: language)
      r.pause(length: 1)
    end

    render xml: response.to_s
  end

  # Handle call status callbacks
  # POST /twilio/status
  def status
    call_sid = params['CallSid']
    call_status = params['CallStatus']
    call_duration = params['CallDuration']
    
    # Find the call record and update it
    call = Call.find_by(twilio_sid: call_sid)
    
    if call
      update_call_status(call, call_status, call_duration)
      Rails.logger.info("[Twilio] Call #{call_sid} status: #{call_status}")
    else
      Rails.logger.warn("[Twilio] Received status for unknown call: #{call_sid}")
    end

    head :ok
  end

  private

  def update_call_status(call, status, duration)
    case status
    when 'initiated', 'ringing'
      call.update(status: :queued)
    when 'in-progress'
      call.update(status: :in_progress, started_at: Time.current)
    when 'completed'
      call.update(
        status: :completed,
        duration: duration.to_i,
        ended_at: Time.current,
        cost: calculate_cost(duration.to_i)
      )
    when 'failed', 'busy', 'no-answer', 'canceled'
      call.update(
        status: status.underscore.to_sym,
        ended_at: Time.current
      )
    end
  end

  def calculate_cost(duration_seconds)
    return 0 if duration_seconds.nil? || duration_seconds.zero?
    (duration_seconds / 60.0 * 0.013).round(4)
  end
end
