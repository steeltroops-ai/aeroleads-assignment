# frozen_string_literal: true

class ReportsController < ApplicationController
  def index
    @date_range = params[:date_range] || 'last_7_days'
    @start_date, @end_date = calculate_date_range(@date_range)
    
    # Call statistics
    @calls_in_range = Call.where(created_at: @start_date..@end_date)
    @total_calls = @calls_in_range.count
    @completed_calls = @calls_in_range.successful.count
    @failed_calls = @calls_in_range.failed_calls.count
    @total_duration = @calls_in_range.sum(:duration) || 0
    @total_cost = @calls_in_range.sum(:cost) || 0
    
    # Average metrics
    @avg_duration = @completed_calls > 0 ? (@total_duration.to_f / @completed_calls).round(2) : 0
    @avg_cost_per_call = @total_calls > 0 ? (@total_cost / @total_calls).round(4) : 0
    @success_rate = @total_calls > 0 ? ((@completed_calls.to_f / @total_calls) * 100).round(2) : 0
    
    # Daily breakdown
    @daily_stats = calculate_daily_stats(@start_date, @end_date)
    
    # Cost breakdown by status
    @cost_by_status = @calls_in_range.group(:status).sum(:cost)
    
    # Top contacts by call volume
    @top_contacts = Contact.joins(:calls)
                           .where(calls: { created_at: @start_date..@end_date })
                           .select('contacts.*, COUNT(calls.id) as call_count, SUM(calls.cost) as total_cost')
                           .group('contacts.id')
                           .order('call_count DESC')
                           .limit(10)
    
    # Campaign breakdown
    @campaign_stats = calculate_campaign_stats(@start_date, @end_date)
  end

  def export
    @date_range = params[:date_range] || 'last_7_days'
    @start_date, @end_date = calculate_date_range(@date_range)
    
    require 'csv'
    
    csv_data = CSV.generate(headers: true) do |csv|
      csv << ['Date', 'Contact Name', 'Phone Number', 'Status', 'Duration (s)', 'Cost ($)', 'Campaign', 'Created At']
      
      Call.includes(:contact)
          .where(created_at: @start_date..@end_date)
          .order(created_at: :desc)
          .find_each do |call|
        csv << [
          call.created_at.strftime('%Y-%m-%d'),
          call.contact.name || 'Unknown',
          call.contact.phone_number,
          call.status,
          call.duration || 0,
          call.cost || 0,
          call.contact.campaign_id || 'N/A',
          call.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ]
      end
    end

    send_data csv_data,
              filename: "call_report_#{@start_date.strftime('%Y%m%d')}_#{@end_date.strftime('%Y%m%d')}.csv",
              type: 'text/csv',
              disposition: 'attachment'
  end

  def cost_analysis
    @monthly_costs = Call.where('created_at >= ?', 12.months.ago)
                        .group("DATE_TRUNC('month', created_at)")
                        .sum(:cost)
                        .transform_keys { |k| k.strftime('%Y-%m') }
    
    @cost_by_hour = Call.where('created_at >= ?', 7.days.ago)
                       .group("EXTRACT(HOUR FROM created_at)")
                       .sum(:cost)
    
    @projected_monthly_cost = calculate_projected_monthly_cost
  end

  private

  def calculate_date_range(range)
    case range
    when 'today'
      [Time.current.beginning_of_day, Time.current.end_of_day]
    when 'yesterday'
      [1.day.ago.beginning_of_day, 1.day.ago.end_of_day]
    when 'last_7_days'
      [7.days.ago.beginning_of_day, Time.current.end_of_day]
    when 'last_30_days'
      [30.days.ago.beginning_of_day, Time.current.end_of_day]
    when 'this_month'
      [Time.current.beginning_of_month, Time.current.end_of_day]
    when 'last_month'
      [1.month.ago.beginning_of_month, 1.month.ago.end_of_month]
    when 'custom'
      start_date = params[:start_date].present? ? Time.zone.parse(params[:start_date]) : 7.days.ago
      end_date = params[:end_date].present? ? Time.zone.parse(params[:end_date]) : Time.current
      [start_date.beginning_of_day, end_date.end_of_day]
    else
      [7.days.ago.beginning_of_day, Time.current.end_of_day]
    end
  end

  def calculate_daily_stats(start_date, end_date)
    Call.where(created_at: start_date..end_date)
        .group("DATE(created_at)")
        .select("DATE(created_at) as date, 
                 COUNT(*) as total_calls,
                 COUNT(CASE WHEN status = #{Call.statuses[:completed]} THEN 1 END) as completed_calls,
                 SUM(duration) as total_duration,
                 SUM(cost) as total_cost")
        .order('date DESC')
  end

  def calculate_campaign_stats(start_date, end_date)
    Contact.joins(:calls)
           .where(calls: { created_at: start_date..end_date })
           .where.not(campaign_id: nil)
           .group('contacts.campaign_id')
           .select('contacts.campaign_id,
                    COUNT(calls.id) as call_count,
                    COUNT(CASE WHEN calls.status = #{Call.statuses[:completed]} THEN 1 END) as completed_count,
                    SUM(calls.cost) as total_cost')
  end

  def calculate_projected_monthly_cost
    # Calculate average daily cost for last 7 days
    last_7_days_cost = Call.where('created_at >= ?', 7.days.ago).sum(:cost) || 0
    avg_daily_cost = last_7_days_cost / 7.0
    
    # Project for 30 days
    (avg_daily_cost * 30).round(2)
  end
end
