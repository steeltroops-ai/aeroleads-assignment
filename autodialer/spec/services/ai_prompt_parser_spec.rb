# frozen_string_literal: true

require 'spec_helper'
require 'openai'
require_relative '../../lib/services/ai_prompt_parser'

RSpec.describe Services::AiPromptParser do
  let(:api_key) { 'test-api-key-123' }
  let(:parser) { described_class.new(api_key: api_key) }

  describe '#initialize' do
    context 'with valid API key' do
      it 'creates a parser instance' do
        expect(parser).to be_a(Services::AiPromptParser)
        expect(parser.client).to be_a(OpenAI::Client)
      end
    end

    context 'without API key' do
      it 'raises ConfigurationError' do
        allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return(nil)
        
        expect {
          described_class.new
        }.to raise_error(Services::AiPromptParser::ConfigurationError, /Missing OpenAI API key/)
      end
    end
  end

  describe '#extract_phone_numbers' do
    it 'extracts E.164 format numbers' do
      text = "Call +18001234567 and +14155551234"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to contain_exactly('+18001234567', '+14155551234')
    end

    it 'extracts US format with dashes' do
      text = "Call 800-123-4567"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to include('+18001234567')
    end

    it 'extracts US format with parentheses' do
      text = "Call (800) 123-4567"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to include('+18001234567')
    end

    it 'extracts US format with dots' do
      text = "Call 800.123.4567"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to include('+18001234567')
    end

    it 'extracts toll-free numbers with 1 prefix' do
      text = "Call 1-800-123-4567"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to include('+18001234567')
    end

    it 'returns unique numbers only' do
      text = "Call +18001234567 or 800-123-4567"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers.size).to eq(1)
      expect(numbers).to include('+18001234567')
    end

    it 'returns empty array when no numbers found' do
      text = "No phone numbers here"
      numbers = parser.extract_phone_numbers(text)
      
      expect(numbers).to be_empty
    end
  end

  describe '#validate_intent' do
    it 'validates correct intent structure' do
      intent = {
        intent: 'make_call',
        phone_numbers: ['+18001234567'],
        message: 'Test message'
      }
      
      expect(parser.validate_intent(intent)).to be true
    end

    it 'raises error for non-hash intent' do
      expect {
        parser.validate_intent("not a hash")
      }.to raise_error(Services::AiPromptParser::ParseError, /Intent must be a hash/)
    end

    it 'raises error for missing phone numbers' do
      intent = {
        intent: 'make_call',
        phone_numbers: [],
        message: 'Test message'
      }
      
      expect {
        parser.validate_intent(intent)
      }.to raise_error(Services::AiPromptParser::ParseError, /must contain at least one phone number/)
    end

    it 'raises error for missing message' do
      intent = {
        intent: 'make_call',
        phone_numbers: ['+18001234567'],
        message: ''
      }
      
      expect {
        parser.validate_intent(intent)
      }.to raise_error(Services::AiPromptParser::ParseError, /must contain a message/)
    end

    it 'raises error for invalid phone number format' do
      intent = {
        intent: 'make_call',
        phone_numbers: ['invalid-number'],
        message: 'Test message'
      }
      
      expect {
        parser.validate_intent(intent)
      }.to raise_error(Services::AiPromptParser::ParseError, /Invalid phone number format/)
    end
  end

  describe '#parse_prompt' do
    let(:mock_response) do
      {
        "choices" => [
          {
            "message" => {
              "content" => {
                intent: 'make_call',
                phone_numbers: ['+18001234567'],
                message: 'This is a test message'
              }.to_json
            }
          }
        ]
      }
    end

    before do
      allow(parser.client).to receive(:chat).and_return(mock_response)
    end

    it 'parses a simple call request' do
      prompt = "call +18001234567 with test message"
      result = parser.parse_prompt(prompt)
      
      expect(result[:intent]).to eq('make_call')
      expect(result[:phone_numbers]).to include('+18001234567')
      expect(result[:message]).to eq('This is a test message')
    end

    it 'raises error for blank prompt' do
      expect {
        parser.parse_prompt("")
      }.to raise_error(Services::AiPromptParser::ParseError, /Prompt cannot be blank/)
    end

    context 'when OpenAI API fails' do
      before do
        allow(parser.client).to receive(:chat).and_raise(OpenAI::Error.new("API error"))
      end

      it 'raises ParseError with API error message' do
        expect {
          parser.parse_prompt("call +18001234567 with test")
        }.to raise_error(Services::AiPromptParser::ParseError, /OpenAI API error/)
      end
    end

    context 'with various prompt formats' do
      it 'handles "dial" keyword' do
        mock_response["choices"][0]["message"]["content"] = {
          intent: 'make_call',
          phone_numbers: ['+18001234567'],
          message: 'hello world'
        }.to_json
        
        result = parser.parse_prompt("dial 800-123-4567 and say hello world")
        
        expect(result[:intent]).to eq('make_call')
        expect(result[:phone_numbers]).not_to be_empty
        expect(result[:message]).not_to be_empty
      end

      it 'handles "phone" keyword' do
        mock_response["choices"][0]["message"]["content"] = {
          intent: 'make_call',
          phone_numbers: ['+18001234567'],
          message: 'welcome message'
        }.to_json
        
        result = parser.parse_prompt("phone (800) 123-4567 with welcome message")
        
        expect(result[:intent]).to eq('make_call')
        expect(result[:phone_numbers]).not_to be_empty
        expect(result[:message]).not_to be_empty
      end

      it 'handles multiple phone numbers' do
        mock_response["choices"][0]["message"]["content"] = {
          intent: 'make_call',
          phone_numbers: ['+18001234567', '+18009876543'],
          message: 'bulk message'
        }.to_json
        
        result = parser.parse_prompt("call +18001234567 and +18009876543 with bulk message")
        
        expect(result[:phone_numbers].size).to eq(2)
      end
    end

    context 'with fallback parsing' do
      before do
        # Simulate OpenAI returning unclear intent
        mock_response["choices"][0]["message"]["content"] = {
          intent: 'unclear',
          phone_numbers: [],
          message: ''
        }.to_json
      end

      it 'falls back to regex extraction' do
        allow(parser).to receive(:extract_phone_numbers).and_return(['+18001234567'])
        allow(parser).to receive(:extract_message).and_return('test message')
        
        result = parser.parse_prompt("call +18001234567 with test message")
        
        expect(result[:intent]).to eq('make_call')
        expect(result[:phone_numbers]).to include('+18001234567')
        expect(result[:message]).to eq('test message')
      end
    end

    context 'with invalid JSON response' do
      before do
        mock_response["choices"][0]["message"]["content"] = "Invalid JSON response"
        allow(parser).to receive(:extract_phone_numbers).and_return(['+18001234567'])
        allow(parser).to receive(:extract_message).and_return('fallback message')
      end

      it 'uses fallback parsing' do
        result = parser.parse_prompt("call +18001234567 with fallback message")
        
        expect(result[:intent]).to eq('make_call')
        expect(result[:phone_numbers]).to include('+18001234567')
        expect(result[:message]).to eq('fallback message')
      end
    end
  end

  describe 'integration scenarios' do
    let(:mock_response) do
      {
        "choices" => [
          {
            "message" => {
              "content" => {
                intent: 'make_call',
                phone_numbers: ['+18001234567'],
                message: 'This is a test call'
              }.to_json
            }
          }
        ]
      }
    end

    before do
      allow(parser.client).to receive(:chat).and_return(mock_response)
    end

    it 'handles complete workflow' do
      prompt = "call +18001234567 with This is a test call"
      result = parser.parse_prompt(prompt)
      
      expect(result).to be_a(Hash)
      expect(result[:intent]).to eq('make_call')
      expect(result[:phone_numbers]).to be_an(Array)
      expect(result[:phone_numbers].first).to match(/\A\+\d+\z/)
      expect(result[:message]).to be_a(String)
      expect(result[:message]).not_to be_empty
    end

    it 'validates the parsed result' do
      prompt = "call +18001234567 with test"
      result = parser.parse_prompt(prompt)
      
      expect { parser.validate_intent(result) }.not_to raise_error
    end
  end
end
