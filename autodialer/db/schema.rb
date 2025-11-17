# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_11_07_122003) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "call_budgets", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.decimal "current_daily_spend", precision: 10, scale: 2, default: "0.0"
    t.decimal "current_monthly_spend", precision: 10, scale: 2, default: "0.0"
    t.decimal "daily_limit", precision: 10, scale: 2, default: "0.0"
    t.date "last_reset_date"
    t.decimal "monthly_limit", precision: 10, scale: 2, default: "0.0"
    t.string "name", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_call_budgets_on_name", unique: true
  end

  create_table "calls", force: :cascade do |t|
    t.bigint "contact_id", null: false
    t.decimal "cost", precision: 10, scale: 4
    t.datetime "created_at", null: false
    t.integer "duration"
    t.datetime "ended_at"
    t.text "error_message"
    t.text "message"
    t.integer "recording_duration"
    t.string "recording_url"
    t.datetime "scheduled_at"
    t.datetime "started_at"
    t.integer "status", default: 0, null: false
    t.string "twilio_sid"
    t.datetime "updated_at", null: false
    t.index ["contact_id", "created_at"], name: "index_calls_on_contact_id_and_created_at"
    t.index ["contact_id"], name: "index_calls_on_contact_id"
    t.index ["created_at"], name: "index_calls_on_created_at"
    t.index ["recording_url"], name: "index_calls_on_recording_url"
    t.index ["scheduled_at"], name: "index_calls_on_scheduled_at"
    t.index ["started_at"], name: "index_calls_on_started_at"
    t.index ["status"], name: "index_calls_on_status"
    t.index ["twilio_sid"], name: "index_calls_on_twilio_sid", unique: true
  end

  create_table "contacts", force: :cascade do |t|
    t.string "campaign_id"
    t.datetime "created_at", null: false
    t.string "email"
    t.string "name"
    t.text "notes"
    t.string "phone_number", null: false
    t.integer "status", default: 0
    t.string "tags", default: [], array: true
    t.datetime "updated_at", null: false
    t.index ["campaign_id"], name: "index_contacts_on_campaign_id"
    t.index ["created_at"], name: "index_contacts_on_created_at"
    t.index ["email"], name: "index_contacts_on_email"
    t.index ["phone_number"], name: "index_contacts_on_phone_number"
    t.index ["status"], name: "index_contacts_on_status"
    t.index ["tags"], name: "index_contacts_on_tags", using: :gin
  end

  add_foreign_key "calls", "contacts"
end
