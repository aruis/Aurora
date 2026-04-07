package net.ximatai.aurora.operationlog;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/operation-logs")
@PreAuthorize("hasRole('ADMIN')")
public class OperationLogController {

	private final OperationLogService operationLogService;

	public OperationLogController(OperationLogService operationLogService) {
		this.operationLogService = operationLogService;
	}

	@GetMapping
	public OperationLogListResponse list(@RequestParam(required = false) String operatorUsername,
		@RequestParam(required = false) String moduleName,
		@RequestParam(required = false) String actionName) {
		return operationLogService.listRecent(operatorUsername, moduleName, actionName);
	}
}
