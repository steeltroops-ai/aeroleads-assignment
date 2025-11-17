# frozen_string_literal: true

class AddBulkOperationFieldsToContacts < ActiveRecord::Migration[8.1]
  def change
    # Add tags for bulk operations and filtering
    add_column :contacts, :tags, :string, array: true, default: []
    
    # Add campaign identifier for grouping
    add_column :contacts, :campaign_id, :string
    
    # Add status for contact management
    add_column :contacts, :status, :integer, default: 0
    
    # Add indexes
    add_index :contacts, :tags, using: 'gin'
    add_index :contacts, :campaign_id
    add_index :contacts, :status
  end
end
