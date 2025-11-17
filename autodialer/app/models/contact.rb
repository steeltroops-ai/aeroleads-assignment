class Contact < ApplicationRecord
  # Associations
  has_many :calls, dependent: :destroy

  # Enums
  enum :status, {
    active: 0,
    inactive: 1,
    blocked: 2,
    do_not_call: 3
  }, default: :active

  # Validations
  validates :phone_number, presence: true, 
                          uniqueness: true,
                          format: { with: /\A\+?[1-9]\d{1,14}\z/, 
                                   message: "must be a valid E.164 format phone number" }
  validates :name, length: { maximum: 255 }
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true }
  validates :campaign_id, length: { maximum: 100 }, allow_blank: true
  validate :validate_safe_number_in_development
  validate :validate_tags_format

  # Callbacks
  before_validation :normalize_phone_number
  before_validation :normalize_tags

  # Scopes
  scope :recent, -> { order(created_at: :desc) }
  scope :toll_free, -> { where("phone_number LIKE ? OR phone_number LIKE ?", "+1800%", "+1888%") }
  scope :safe_for_testing, -> { toll_free }
  scope :by_campaign, ->(campaign_id) { where(campaign_id: campaign_id) }
  scope :with_tag, ->(tag) { where("? = ANY(tags)", tag) }
  scope :callable, -> { where(status: [:active]) }

  # Check if phone number is toll-free (safe for testing)
  # @return [Boolean]
  def toll_free?
    return false if phone_number.blank?
    
    normalized = phone_number.gsub(/[\s\-\(\)]/, '')
    # US/Canada toll-free prefixes: 800, 888, 877, 866, 855, 844, 833
    toll_free_prefixes = %w[800 888 877 866 855 844 833]
    
    toll_free_prefixes.any? do |prefix|
      normalized.match?(/\A\+?1#{prefix}/) || normalized.match?(/\A#{prefix}/)
    end
  end

  # Check if number is safe to call in development
  # @return [Boolean]
  def safe_for_development?
    toll_free? || Rails.env.test?
  end

  # Check if contact can be called
  # @return [Boolean]
  def callable?
    active? && !do_not_call?
  end

  # Add a tag to the contact
  # @param tag [String] Tag to add
  def add_tag(tag)
    self.tags ||= []
    self.tags << tag.to_s.strip unless self.tags.include?(tag.to_s.strip)
    save
  end

  # Remove a tag from the contact
  # @param tag [String] Tag to remove
  def remove_tag(tag)
    self.tags ||= []
    self.tags.delete(tag.to_s.strip)
    save
  end

  private

  def normalize_phone_number
    return if phone_number.blank?
    # Remove spaces, dashes, and parentheses
    self.phone_number = phone_number.gsub(/[\s\-\(\)]/, '')
  end

  def normalize_tags
    return if tags.blank?
    self.tags = tags.map { |t| t.to_s.strip.downcase }.uniq.reject(&:blank?)
  end

  def validate_safe_number_in_development
    return unless Rails.env.development?
    return if ENV['ALLOW_REAL_CALLS'] == 'true'
    
    unless toll_free?
      errors.add(:phone_number, "must be a toll-free number in development mode (800, 888, 877, 866, 855, 844, 833). Set ALLOW_REAL_CALLS=true to override.")
    end
  end

  def validate_tags_format
    return if tags.blank?
    
    if tags.any? { |t| t.to_s.length > 50 }
      errors.add(:tags, "each tag must be 50 characters or less")
    end
    
    if tags.length > 20
      errors.add(:tags, "cannot have more than 20 tags")
    end
  end
end
