package net.ximatai.aurora.operationlog;

import java.time.LocalDateTime;

public record OperationLogResponse(
	Long id,
	String moduleName,
	String actionName,
	String targetType,
	String targetId,
	String targetName,
	String detail,
	Long operatorId,
	String operatorUsername,
	String operatorDisplayName,
	String operatorRoles,
	String ipAddress,
	String requestMethod,
	String requestPath,
	boolean success,
	LocalDateTime operatedAt
) {

	public static OperationLogResponse from(OperationLog log) {
		return new OperationLogResponse(
			log.getId(),
			log.getModuleName(),
			log.getActionName(),
			log.getTargetType(),
			log.getTargetId(),
			log.getTargetName(),
			log.getDetail(),
			log.getOperatorId(),
			log.getOperatorUsername(),
			log.getOperatorDisplayName(),
			log.getOperatorRoles(),
			log.getIpAddress(),
			log.getRequestMethod(),
			log.getRequestPath(),
			log.isSuccess(),
			log.getOperatedAt()
		);
	}
}
