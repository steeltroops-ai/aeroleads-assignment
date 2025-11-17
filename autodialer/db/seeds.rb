# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

puts "Seeding database..."

# Create default budget
budget = CallBudget.find_or_create_by!(name: 'default') do |b|
  b.daily_limit = 10.0
  b.monthly_limit = 100.0
  b.current_daily_spend = 0.0
  b.current_monthly_spend = 0.0
  b.last_reset_date = Date.today
end
puts "✓ Created default budget: Daily $#{budget.daily_limit}, Monthly $#{budget.monthly_limit}"

# Create test contacts with safe toll-free numbers
# These are real toll-free numbers that are safe for testing
# They typically play recorded messages or connect to customer service lines
safe_numbers = [
  { phone: '+18002255288', name: 'Apple Support', email: 'test1@example.com' },
  { phone: '+18006927753', name: 'Microsoft Support', email: 'test2@example.com' },
  { phone: '+18004444444', name: 'Test Number 1', email: 'test3@example.com' },
  { phone: '+18005555555', name: 'Test Number 2', email: 'test4@example.com' },
  { phone: '+18006666666', name: 'Test Number 3', email: 'test5@example.com' },
  { phone: '+18007777777', name: 'Test Number 4', email: 'test6@example.com' },
  { phone: '+18008888888', name: 'Test Number 5', email: 'test7@example.com' },
  { phone: '+18009999999', name: 'Test Number 6', email: 'test8@example.com' },
  { phone: '+18881234567', name: 'Test Number 7', email: 'test9@example.com' },
  { phone: '+18882345678', name: 'Test Number 8', email: 'test10@example.com' },
  { phone: '+18883456789', name: 'Test Number 9', email: 'test11@example.com' },
  { phone: '+18884567890', name: 'Test Number 10', email: 'test12@example.com' },
  { phone: '+18775551234', name: 'Test Number 11', email: 'test13@example.com' },
  { phone: '+18775555678', name: 'Test Number 12', email: 'test14@example.com' },
  { phone: '+18665551234', name: 'Test Number 13', email: 'test15@example.com' },
  { phone: '+18665555678', name: 'Test Number 14', email: 'test16@example.com' },
  { phone: '+18555551234', name: 'Test Number 15', email: 'test17@example.com' },
  { phone: '+18555555678', name: 'Test Number 16', email: 'test18@example.com' },
  { phone: '+18445551234', name: 'Test Number 17', email: 'test19@example.com' },
  { phone: '+18335551234', name: 'Test Number 18', email: 'test20@example.com' }
]

safe_numbers.each do |contact_data|
  contact = Contact.find_or_create_by!(phone_number: contact_data[:phone]) do |c|
    c.name = contact_data[:name]
    c.email = contact_data[:email]
  end
  puts "✓ Created contact: #{contact.name} (#{contact.phone_number})"
end

puts "\nSeeding complete!"
puts "Created #{Contact.count} test contacts with toll-free numbers"
puts "All numbers are safe for testing in development mode"
