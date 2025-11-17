class CreateCallBudgets < ActiveRecord::Migration[8.1]
  def change
    create_table :call_budgets do |t|
      t.string :name, null: false
      t.decimal :daily_limit, precision: 10, scale: 2, default: 0.0
      t.decimal :monthly_limit, precision: 10, scale: 2, default: 0.0
      t.decimal :current_daily_spend, precision: 10, scale: 2, default: 0.0
      t.decimal :current_monthly_spend, precision: 10, scale: 2, default: 0.0
      t.date :last_reset_date

      t.timestamps
    end
    
    add_index :call_budgets, :name, unique: true
  end
end
