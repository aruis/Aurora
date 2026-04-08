package net.ximatai.aurora.dictionary;

public record DictionaryOptionResponse(
	String type,
	String code,
	String label
) {

	public static DictionaryOptionResponse from(DictionaryEntry entry) {
		return new DictionaryOptionResponse(entry.getType().code(), entry.getCode(), entry.getLabel());
	}
}
