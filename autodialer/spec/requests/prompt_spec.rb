require 'rails_helper'

RSpec.describe "Prompts", type: :request do
  describe "POST /prompt" do
    context "with valid prompt" do
      it "processes AI prompt and queues calls" do
        # Mock the AI parser
        parser = instance_double(Services::AiPromptParser)
        allow(Services::AiPromptParser).to receive(:new).and_return(parser)
        allow(parser).to receive(:parse_prompt).and_return({
          intent: "make_call",
          phone_numbers: ["+18001234567"],
          message: "Hello world"
        })

        expect {
          post prompt_path, params: { prompt: "call +18001234567 with hello world" }
        }.to change(Contact, :count).by(1)
         .and change(Call, :count).by(1)

        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Successfully queued 1 call")
      end

      it "handles multiple phone numbers" do
        parser = instance_double(Services::AiPromptParser)
        allow(Services::AiPromptParser).to receive(:new).and_return(parser)
        allow(parser).to receive(:parse_prompt).and_return({
          intent: "make_call",
          phone_numbers: ["+18001234567", "+18009876543"],
          message: "Test message"
        })

        expect {
          post prompt_path, params: { prompt: "call +18001234567 and +18009876543 with test message" }
        }.to change(Contact, :count).by(2)
         .and change(Call, :count).by(2)

        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Successfully queued 2 call")
      end
    end

    context "with unclear prompt" do
      it "shows error message" do
        parser = instance_double(Services::AiPromptParser)
        allow(Services::AiPromptParser).to receive(:new).and_return(parser)
        allow(parser).to receive(:parse_prompt).and_return({
          intent: "unclear",
          phone_numbers: [],
          message: ""
        })

        post prompt_path, params: { prompt: "unclear request" }
        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Could not understand the prompt")
      end
    end

    context "with no prompt" do
      it "shows error message" do
        post prompt_path, params: { prompt: "" }
        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Please provide a prompt")
      end
    end

    context "when AI service is not configured" do
      it "shows configuration error" do
        allow(Services::AiPromptParser).to receive(:new).and_raise(
          Services::AiPromptParser::ConfigurationError.new("Missing API key")
        )

        post prompt_path, params: { prompt: "call +18001234567 with test" }
        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("AI service not configured")
      end
    end
  end
end
