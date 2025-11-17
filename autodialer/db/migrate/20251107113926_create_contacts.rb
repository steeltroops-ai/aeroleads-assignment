class CreateContacts < ActiveRecord::Migration[8.1]
  def change
    create_table :contacts do |t|
      t.string :phone_number, null: false
      t.string :name
      t.string :email
      t.text :notes

      t.timestamps
    end

    add_index :contacts, :phone_number
    add_index :contacts, :email
    add_index :contacts, :created_at
  end
end
