package net.ximatai.aurora.operationlog;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OperationLogCleanupJob {

	private final OperationLogService operationLogService;

	public OperationLogCleanupJob(OperationLogService operationLogService) {
		this.operationLogService = operationLogService;
	}

	@Scheduled(cron = "0 15 3 * * *")
	public void cleanupExpiredLogs() {
		operationLogService.cleanupExpiredLogs();
	}
}
