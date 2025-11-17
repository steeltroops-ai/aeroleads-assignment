class CallsController < ApplicationController
  def index
    # Dashboard with statistics
    @calls = Call.includes(:contact).recent.limit(50)
    @total_calls = Call.count
    @completed_calls = Call.successful.count
    @failed_calls = Call.failed_calls.count
    @pending_calls = Call.where(status: [:pending, :queued]).count
    @in_progress_calls = Call.where(status: :in_progress).count
    
    # Calculate success rate
    @success_rate = @total_calls > 0 ? ((@completed_calls.to_f / @total_calls) * 100).round(2) : 0
    
    # Calculate total cost
    @total_cost = Call.sum(:cost) || 0
    
    # Recent calls for display
    @recent_calls = Call.includes(:contact).recent.limit(10)
  end

  def show
    @call = Call.includes(:contact).find(params[:id])
  rescue ActiveRecord::RecordNotFound
    redirect_to calls_path, alert: "Call not found"
  end

  def cancel
    @call = Call.find(params[:id])
    
    if @call.in_progress? || @call.queued?
      # Cancel the call via Twilio if it has a SID
      if @call.twilio_sid.present?
        begin
          twilio_client = Services::TwilioClient.new
          twilio_client.cancel_call(@call.twilio_sid)
        rescue Services::TwilioClient::CallError => e
          Rails.logger.error("Failed to cancel call via Twilio: #{e.message}")
        end
      end
      
      @call.update(status: :canceled, ended_at: Time.current)
      redirect_to call_path(@call), notice: "Call has been canceled"
    else
      redirect_to call_path(@call), alert: "Call cannot be canceled in its current state"
    end
  rescue ActiveRecord::RecordNotFound
    redirect_to calls_path, alert: "Call not found"
  end

  def recording
    @call = Call.find(params[:id])
    
    if @call.has_recording?
      redirect_to @call.recording_url, allow_other_host: true
    else
      redirect_to call_path(@call), alert: "No recording available for this call"
    end
  rescue ActiveRecord::RecordNotFound
    redirect_to calls_path, alert: "Call not found"
  end
end
