class CreateCalls < ActiveRecord::Migration[8.1]
  def change
    create_table :calls do |t|
      t.references :contact, null: false, foreign_key: true
      t.integer :status, default: 0, null: false
      t.integer :duration
      t.decimal :cost, precision: 10, scale: 4
      t.string :twilio_sid
      t.datetime :started_at
      t.datetime :ended_at
      t.text :error_message
      t.text :message

      t.timestamps
    end

    add_index :calls, :status
    add_index :calls, :twilio_sid, unique: true
    add_index :calls, :started_at
    add_index :calls, :created_at
    add_index :calls, [:contact_id, :created_at]
  end
end
