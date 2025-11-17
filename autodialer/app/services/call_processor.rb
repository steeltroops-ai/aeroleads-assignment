# frozen_string_literal: true

# CallProcessor handles batch call processing and sequential queuing
class CallProcessor
  attr_reader :calls, :options

  def initialize(calls, options = {})
    @calls = Array(calls)
    @options = options
  end

  # Enqueue all calls for sequential processing
  # @param delay [Integer] Optional delay in seconds between each call
  # @return [Array<ActiveJob>] Array of enqueued jobs
  def enqueue_all(delay: 0)
    jobs = []
    
    calls.each_with_index do |call, index|
      wait_time = delay * index
      
      if wait_time.zero?
        jobs << CallJob.perform_later(call.id)
      else
        jobs << CallJob.set(wait: wait_time.seconds).perform_later(call.id)
      end
    end
    
    jobs
  end

  # Process all calls immediately (for testing)
  # @return [Array<Call>] Array of processed calls
  def process_all_now
    calls.each do |call|
      CallJob.perform_now(call.id)
    end
    
    calls.map(&:reload)
  end

  # Create calls from phone numbers and enqueue them
  # @param contact_ids [Array<Integer>] Array of contact IDs
  # @param message [String] Message to use for all calls
  # @param delay [Integer] Delay in seconds between calls
  # @return [Array<Call>] Array of created calls
  def self.create_and_enqueue(contact_ids, message: nil, delay: 0)
    calls = contact_ids.map do |contact_id|
      Call.create!(
        contact_id: contact_id,
        message: message,
        status: :pending
      )
    end
    
    processor = new(calls)
    processor.enqueue_all(delay: delay)
    
    calls
  end

  # Get statistics for a batch of calls
  # @return [Hash] Statistics hash
  def statistics
    {
      total: calls.count,
      pending: calls.count { |c| c.pending? },
      queued: calls.count { |c| c.queued? },
      in_progress: calls.count { |c| c.in_progress? },
      completed: calls.count { |c| c.completed? },
      failed: calls.count { |c| c.failed? || c.no_answer? || c.busy? },
      canceled: calls.count { |c| c.canceled? }
    }
  end
end
