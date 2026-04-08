package net.ximatai.aurora.dictionary;

public record DictionaryEntryResponse(
	Long id,
	String type,
	String typeLabel,
	String code,
	String label,
	Integer sortOrder,
	boolean enabled,
	long referenceCount
) {

	public static DictionaryEntryResponse from(DictionaryEntry entry, long referenceCount) {
		return new DictionaryEntryResponse(
			entry.getId(),
			entry.getType().code(),
			entry.getType().label(),
			entry.getCode(),
			entry.getLabel(),
			entry.getSortOrder(),
			entry.isEnabled(),
			referenceCount
		);
	}
}
