class UploadController < ApplicationController
  require 'csv'

  def new
    # Display upload form
  end

  def create
    # Validate file size if file upload
    if params[:csv_file].present?
      if params[:csv_file].size > 5.megabytes
        redirect_to upload_path, alert: "File size must be less than 5MB"
        return
      end
      process_csv_file(params[:csv_file])
    elsif params[:csv_text].present?
      if params[:csv_text].length > 1.megabyte
        redirect_to upload_path, alert: "CSV text must be less than 1MB"
        return
      end
      process_csv_text(params[:csv_text])
    else
      redirect_to upload_path, alert: "Please provide a CSV file or paste CSV data"
      return
    end

    if @errors.any?
      flash[:alert] = "Processed #{@queued_count} calls with #{@errors.count} errors. First error: #{@errors.first}"
      flash[:errors] = @errors if @errors.count <= 10
    else
      flash[:notice] = "Successfully queued #{@queued_count} calls"
    end

    redirect_to calls_path
  rescue StandardError => e
    Rails.logger.error("Upload error: #{e.message}")
    Rails.logger.error(e.backtrace.join("\n"))
    redirect_to upload_path, alert: "Error processing CSV: #{e.message}"
  end

  private

  def process_csv_file(file)
    csv_content = file.read
    process_csv_content(csv_content)
  end

  def process_csv_text(text)
    process_csv_content(text)
  end

  def process_csv_content(content)
    @queued_count = 0
    @errors = []
    @warnings = []
    
    # Validate CSV is not empty
    if content.blank?
      @errors << "CSV content is empty"
      return
    end

    # Parse and validate CSV structure
    begin
      rows = CSV.parse(content, headers: true)
    rescue CSV::MalformedCSVError => e
      @errors << "Invalid CSV format: #{e.message}"
      return
    end

    # Validate headers
    unless has_phone_column?(rows.headers)
      @errors << "CSV must have a 'phone' or 'phone_number' column"
      return
    end

    # Limit number of rows
    if rows.count > 1000
      @errors << "CSV cannot have more than 1000 rows. Please split into smaller batches."
      return
    end

    # Extract optional parameters
    campaign_id = params[:campaign_id]
    scheduled_at = params[:scheduled_at].present? ? Time.zone.parse(params[:scheduled_at]) : nil
    tags = params[:tags].to_s.split(',').map(&:strip).reject(&:blank?)

    rows.each_with_index do |row, index|
      line_number = index + 2 # +2 because index starts at 0 and we skip header
      
      phone_number = extract_phone_number(row)
      name = row['name'] || row['Name'] || nil
      email = row['email'] || row['Email'] || nil
      message = row['message'] || row['Message'] || nil

      # Validate phone number
      if phone_number.blank?
        @errors << "Row #{line_number}: Missing phone number"
        next
      end

      # Validate phone format
      unless phone_number.match?(/\A\+?[1-9]\d{1,14}\z/)
        @errors << "Row #{line_number}: Invalid phone format '#{phone_number}'"
        next
      end

      # Validate email if provided
      if email.present? && !email.match?(URI::MailTo::EMAIL_REGEXP)
        @warnings << "Row #{line_number}: Invalid email format '#{email}', skipping email"
        email = nil
      end

      # Create or find contact
      contact = Contact.find_or_initialize_by(phone_number: phone_number)
      contact.name = name if name.present?
      contact.email = email if email.present?
      contact.campaign_id = campaign_id if campaign_id.present?
      
      # Add tags
      tags.each { |tag| contact.add_tag(tag) } if tags.any?

      if contact.save
        # Create call record
        call = Call.create(
          contact: contact,
          message: message,
          status: :pending,
          scheduled_at: scheduled_at
        )

        if call.persisted?
          # Queue the call job
          call.enqueue_call
          @queued_count += 1
        else
          @errors << "Row #{line_number}: Failed to create call - #{call.errors.full_messages.join(', ')}"
        end
      else
        @errors << "Row #{line_number}: Invalid contact - #{contact.errors.full_messages.join(', ')}"
      end
    end
  end

  def has_phone_column?(headers)
    return false if headers.nil?
    
    phone_columns = ['phone', 'Phone', 'phone_number', 'Phone Number', 
                     'number', 'Number', 'telephone', 'Telephone']
    
    (headers & phone_columns).any?
  end

  def extract_phone_number(row)
    # Try different column names
    phone = row['phone'] || row['Phone'] || row['phone_number'] || row['Phone Number'] || 
            row['number'] || row['Number'] || row['telephone'] || row['Telephone']
    
    phone&.strip
  end
end
