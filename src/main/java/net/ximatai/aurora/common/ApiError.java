package net.ximatai.aurora.common;

import java.util.Map;

public record ApiError(String message, Map<String, String> errors) {

	public ApiError(String message) {
		this(message, Map.of());
	}
}
