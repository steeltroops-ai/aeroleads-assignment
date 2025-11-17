require 'rails_helper'

RSpec.describe "Calls", type: :request do
  describe "GET /calls" do
    it "returns http success and displays dashboard" do
      get calls_path
      expect(response).to have_http_status(:success)
      expect(response.body).to include("Autodialer Dashboard")
    end

    it "displays statistics" do
      # Create some test data
      contact = Contact.create!(phone_number: "+18001234567", name: "Test Contact")
      Call.create!(contact: contact, status: :completed, duration: 60, cost: 0.013)
      Call.create!(contact: contact, status: :failed)

      get calls_path
      expect(response).to have_http_status(:success)
      expect(response.body).to include("Total Calls")
      expect(response.body).to include("Completed")
      expect(response.body).to include("Failed")
    end
  end

  describe "GET /calls/:id" do
    it "returns http success and displays call details" do
      contact = Contact.create!(phone_number: "+18001234567", name: "Test Contact")
      call = Call.create!(contact: contact, status: :completed, duration: 60, cost: 0.013)

      get call_path(call)
      expect(response).to have_http_status(:success)
      expect(response.body).to include("Call Details")
      expect(response.body).to include(contact.phone_number)
    end

    it "redirects when call not found" do
      get call_path(id: 99999)
      expect(response).to redirect_to(calls_path)
      follow_redirect!
      expect(response.body).to include("Call not found")
    end
  end
end
