class PromptController < ApplicationController
  def create
    prompt_text = params[:prompt]

    if prompt_text.blank?
      redirect_to calls_path, alert: "Please provide a prompt"
      return
    end

    begin
      # Parse the prompt using AI
      parser = Services::AiPromptParser.new
      intent = parser.parse_prompt(prompt_text)

      if intent[:intent] == "unclear" || intent[:phone_numbers].empty?
        redirect_to calls_path, alert: "Could not understand the prompt. Please try: 'call +18001234567 with test message'"
        return
      end

      # Create contacts and queue calls for each phone number
      queued_count = 0
      intent[:phone_numbers].each do |phone_number|
        # Create or find contact
        contact = Contact.find_or_create_by(phone_number: phone_number) do |c|
          c.name = "AI Prompt Contact"
        end

        if contact.persisted?
          # Create call record with the message from the prompt
          call = Call.create(
            contact: contact,
            message: intent[:message],
            status: :pending
          )

          # Queue the call job
          CallJob.perform_later(call.id)
          queued_count += 1
        end
      end

      flash[:notice] = "Successfully queued #{queued_count} call(s) from AI prompt"
      redirect_to calls_path

    rescue Services::AiPromptParser::ParseError => e
      Rails.logger.error("AI Prompt Parse Error: #{e.message}")
      redirect_to calls_path, alert: "Error parsing prompt: #{e.message}"
    rescue Services::AiPromptParser::ConfigurationError => e
      Rails.logger.error("AI Configuration Error: #{e.message}")
      redirect_to calls_path, alert: "AI service not configured. Please set OPENAI_API_KEY."
    rescue StandardError => e
      Rails.logger.error("Prompt processing error: #{e.message}")
      redirect_to calls_path, alert: "Error processing prompt: #{e.message}"
    end
  end
end
