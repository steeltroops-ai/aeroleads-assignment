# frozen_string_literal: true

class AddProductionFeaturesToCalls < ActiveRecord::Migration[8.1]
  def change
    # Add recording URL for call recordings
    add_column :calls, :recording_url, :string
    add_column :calls, :recording_duration, :integer
    
    # Add scheduled_at for call scheduling
    add_column :calls, :scheduled_at, :datetime
    
    # Add message field for custom TTS messages
    add_column :calls, :message, :text
    
    # Add indexes for performance
    add_index :calls, :scheduled_at
    add_index :calls, :recording_url
  end
end
