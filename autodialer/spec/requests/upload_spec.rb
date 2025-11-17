require 'rails_helper'

RSpec.describe "Uploads", type: :request do
  describe "GET /upload" do
    it "returns http success and displays upload form" do
      get upload_path
      expect(response).to have_http_status(:success)
      expect(response.body).to include("Upload Contacts")
      expect(response.body).to include("CSV Format Instructions")
    end
  end

  describe "POST /upload" do
    context "with CSV file" do
      it "processes CSV and queues calls" do
        csv_content = "phone,name,message\n+18001234567,John Doe,Hello John"
        file = fixture_file_upload(StringIO.new(csv_content), 'text/csv')

        expect {
          post upload_path, params: { csv_file: file }
        }.to change(Contact, :count).by(1)
         .and change(Call, :count).by(1)

        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Successfully queued 1 calls")
      end
    end

    context "with CSV text" do
      it "processes pasted CSV and queues calls" do
        csv_text = "phone,name,message\n+18001234567,John Doe,Hello John\n+18009876543,Jane Smith,Hi Jane"

        expect {
          post upload_path, params: { csv_text: csv_text }
        }.to change(Contact, :count).by(2)
         .and change(Call, :count).by(2)

        expect(response).to redirect_to(calls_path)
        follow_redirect!
        expect(response.body).to include("Successfully queued 2 calls")
      end
    end

    context "with no data" do
      it "shows error message" do
        post upload_path, params: {}
        expect(response).to redirect_to(upload_path)
        follow_redirect!
        expect(response.body).to include("Please provide a CSV file or paste CSV data")
      end
    end

    context "with invalid CSV" do
      it "handles malformed CSV gracefully" do
        csv_text = "phone,name\n+18001234567,John Doe\nInvalid Line Without Comma"

        post upload_path, params: { csv_text: csv_text }
        expect(response).to redirect_to(calls_path)
      end
    end
  end
end
