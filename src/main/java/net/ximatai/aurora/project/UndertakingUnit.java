package net.ximatai.aurora.project;

import java.util.Arrays;

public enum UndertakingUnit {

	FIFTH_TEAM("五队"),
	SECOND_SURVEY_INSTITUTE("二勘院");

	private final String label;

	UndertakingUnit(String label) {
		this.label = label;
	}

	public String label() {
		return label;
	}

	public static boolean isSupported(String value) {
		return Arrays.stream(values()).anyMatch(item -> item.label.equals(value));
	}
}
