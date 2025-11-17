# frozen_string_literal: true

module Api
  class CallsController < ApplicationController
    skip_before_action :verify_authenticity_token
    
    # GET /api/calls/status
    # Returns current status of all recent calls for real-time updates
    def status
      calls = Call.includes(:contact)
                  .where('updated_at >= ?', 5.minutes.ago)
                  .order(updated_at: :desc)
                  .limit(50)
      
      render json: {
        calls: calls.map { |call| call_status_json(call) },
        timestamp: Time.current.iso8601,
        stats: current_stats
      }
    end

    # GET /api/calls/:id
    # Returns detailed status of a specific call
    def show
      call = Call.includes(:contact).find(params[:id])
      
      render json: {
        call: call_detail_json(call),
        timestamp: Time.current.iso8601
      }
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Call not found' }, status: :not_found
    end

    # GET /api/calls/:id/recording
    # Returns recording information for a call
    def recording
      call = Call.find(params[:id])
      
      if call.has_recording?
        render json: {
          recording: {
            url: call.recording_url,
            duration: call.recording_duration,
            available: call.recording_available?
          }
        }
      else
        render json: { error: 'No recording available' }, status: :not_found
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: 'Call not found' }, status: :not_found
    end

    # GET /api/stats
    # Returns current dashboard statistics
    def stats
      render json: current_stats
    end

    private

    def call_status_json(call)
      {
        id: call.id,
        contact_id: call.contact_id,
        contact_name: call.contact.name,
        phone_number: call.contact.phone_number,
        status: call.status,
        duration: call.duration,
        cost: call.cost,
        scheduled_at: call.scheduled_at,
        started_at: call.started_at,
        ended_at: call.ended_at,
        has_recording: call.has_recording?,
        updated_at: call.updated_at.iso8601
      }
    end

    def call_detail_json(call)
      call_status_json(call).merge(
        message: call.message,
        twilio_sid: call.twilio_sid,
        error_message: call.error_message,
        recording_url: call.recording_url,
        recording_duration: call.recording_duration,
        created_at: call.created_at.iso8601
      )
    end

    def current_stats
      {
        total_calls: Call.count,
        completed_calls: Call.successful.count,
        failed_calls: Call.failed_calls.count,
        pending_calls: Call.where(status: [:pending, :queued]).count,
        in_progress_calls: Call.where(status: :in_progress).count,
        scheduled_calls: Call.scheduled.count,
        total_cost: Call.sum(:cost) || 0,
        success_rate: calculate_success_rate
      }
    end

    def calculate_success_rate
      total = Call.count
      return 0 if total.zero?
      
      completed = Call.successful.count
      ((completed.to_f / total) * 100).round(2)
    end
  end
end
