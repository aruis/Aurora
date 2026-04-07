package net.ximatai.aurora.project;

import java.util.Arrays;

public enum ProjectCategory {

	MARKET_PROJECT("市场项目"),
	PLATFORM_COMPANY("平台公司"),
	GOVERNMENT_FINANCE("政府财政");

	private final String label;

	ProjectCategory(String label) {
		this.label = label;
	}

	public String label() {
		return label;
	}

	public static boolean isSupported(String value) {
		return Arrays.stream(values()).anyMatch(item -> item.label.equals(value));
	}
}
