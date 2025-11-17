# frozen_string_literal: true

class BulkOperationsController < ApplicationController
  before_action :load_contacts, only: [:create]

  def new
    @contacts = Contact.recent.limit(100)
    @campaigns = Contact.distinct.pluck(:campaign_id).compact
    @all_tags = Contact.distinct.pluck(:tags).flatten.uniq.compact
  end

  def create
    operation = params[:operation]
    
    case operation
    when 'add_tag'
      bulk_add_tag
    when 'remove_tag'
      bulk_remove_tag
    when 'change_status'
      bulk_change_status
    when 'schedule_calls'
      bulk_schedule_calls
    when 'delete'
      bulk_delete
    when 'export'
      bulk_export
    else
      redirect_to bulk_operations_path, alert: "Unknown operation: #{operation}"
    end
  end

  private

  def load_contacts
    @contact_ids = params[:contact_ids] || []
    
    if @contact_ids.empty?
      # Load based on filters
      @contacts = Contact.all
      @contacts = @contacts.by_campaign(params[:campaign_id]) if params[:campaign_id].present?
      @contacts = @contacts.with_tag(params[:tag]) if params[:tag].present?
      @contacts = @contacts.where(status: params[:status]) if params[:status].present?
    else
      @contacts = Contact.where(id: @contact_ids)
    end
  end

  def bulk_add_tag
    tag = params[:tag]&.strip
    
    if tag.blank?
      redirect_to bulk_operations_path, alert: "Tag cannot be blank"
      return
    end

    count = 0
    @contacts.find_each do |contact|
      contact.add_tag(tag)
      count += 1
    end

    redirect_to bulk_operations_path, notice: "Added tag '#{tag}' to #{count} contacts"
  end

  def bulk_remove_tag
    tag = params[:tag]&.strip
    
    if tag.blank?
      redirect_to bulk_operations_path, alert: "Tag cannot be blank"
      return
    end

    count = 0
    @contacts.find_each do |contact|
      contact.remove_tag(tag)
      count += 1
    end

    redirect_to bulk_operations_path, notice: "Removed tag '#{tag}' from #{count} contacts"
  end

  def bulk_change_status
    new_status = params[:new_status]
    
    unless Contact.statuses.keys.include?(new_status)
      redirect_to bulk_operations_path, alert: "Invalid status: #{new_status}"
      return
    end

    count = @contacts.update_all(status: Contact.statuses[new_status])
    redirect_to bulk_operations_path, notice: "Updated status for #{count} contacts to '#{new_status}'"
  end

  def bulk_schedule_calls
    scheduled_at = params[:scheduled_at]
    message = params[:message]
    
    if scheduled_at.blank?
      redirect_to bulk_operations_path, alert: "Scheduled time cannot be blank"
      return
    end

    begin
      scheduled_time = Time.zone.parse(scheduled_at)
      
      if scheduled_time < Time.current
        redirect_to bulk_operations_path, alert: "Scheduled time must be in the future"
        return
      end

      count = 0
      @contacts.callable.find_each do |contact|
        call = Call.create(
          contact: contact,
          message: message,
          scheduled_at: scheduled_time,
          status: :pending
        )
        call.enqueue_call if call.persisted?
        count += 1
      end

      redirect_to bulk_operations_path, notice: "Scheduled #{count} calls for #{scheduled_time.strftime('%Y-%m-%d %H:%M')}"
    rescue ArgumentError => e
      redirect_to bulk_operations_path, alert: "Invalid date/time format: #{e.message}"
    end
  end

  def bulk_delete
    count = @contacts.count
    @contacts.destroy_all
    redirect_to bulk_operations_path, notice: "Deleted #{count} contacts"
  end

  def bulk_export
    require 'csv'
    
    csv_data = CSV.generate(headers: true) do |csv|
      csv << ['Phone Number', 'Name', 'Email', 'Status', 'Campaign', 'Tags', 'Created At']
      
      @contacts.find_each do |contact|
        csv << [
          contact.phone_number,
          contact.name,
          contact.email,
          contact.status,
          contact.campaign_id,
          contact.tags.join(', '),
          contact.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ]
      end
    end

    send_data csv_data, 
              filename: "contacts_export_#{Time.current.strftime('%Y%m%d_%H%M%S')}.csv",
              type: 'text/csv',
              disposition: 'attachment'
  end
end
