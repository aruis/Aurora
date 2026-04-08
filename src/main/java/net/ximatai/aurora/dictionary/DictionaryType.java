package net.ximatai.aurora.dictionary;

public enum DictionaryType {

	UNDERTAKING_UNIT("undertaking_unit", "承接单位"),
	PROJECT_CATEGORY("project_category", "项目类别");

	private final String code;
	private final String label;

	DictionaryType(String code, String label) {
		this.code = code;
		this.label = label;
	}

	public String code() {
		return code;
	}

	public String label() {
		return label;
	}

	public static DictionaryType fromCode(String value) {
		for (DictionaryType type : values()) {
			if (type.code.equalsIgnoreCase(value)) {
				return type;
			}
		}
		throw new IllegalArgumentException("未知字典类型: " + value);
	}
}
