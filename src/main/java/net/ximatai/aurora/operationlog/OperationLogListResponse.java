package net.ximatai.aurora.operationlog;

import java.util.List;

public record OperationLogListResponse(
	int retentionDays,
	List<OperationLogResponse> items
) {
}
