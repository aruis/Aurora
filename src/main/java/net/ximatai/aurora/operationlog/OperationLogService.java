package net.ximatai.aurora.operationlog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import net.ximatai.aurora.auth.AppUserPrincipal;

@Service
@Transactional
public class OperationLogService {

	private final OperationLogRepository operationLogRepository;
	private final OperationLogProperties operationLogProperties;

	public OperationLogService(OperationLogRepository operationLogRepository, OperationLogProperties operationLogProperties) {
		this.operationLogRepository = operationLogRepository;
		this.operationLogProperties = operationLogProperties;
	}

	public void log(String moduleName, String actionName, String targetType, String targetId, String targetName, String detail) {
		log(moduleName, actionName, targetType, targetId, targetName, detail, true, null, null, null);
	}

	public void logWithActor(String moduleName, String actionName, String targetType, String targetId, String targetName,
		String detail, boolean success, Long operatorId, String operatorUsername, String operatorDisplayName) {
		log(moduleName, actionName, targetType, targetId, targetName, detail, success, operatorId, operatorUsername, operatorDisplayName);
	}

	@Transactional(readOnly = true)
	public OperationLogListResponse listRecent(String operatorUsername, String moduleName, String actionName) {
		LocalDateTime cutoff = cutoffDateTime();
		List<OperationLogResponse> items = operationLogRepository.searchRecent(
			cutoff,
			blankToNull(operatorUsername),
			blankToNull(moduleName),
			blankToNull(actionName)).stream()
			.map(OperationLogResponse::from)
			.toList();
		return new OperationLogListResponse(operationLogProperties.getRetentionDays(), items);
	}

	public long cleanupExpiredLogs() {
		return operationLogRepository.deleteExpiredBefore(cutoffEpochMillis());
	}

	private void log(String moduleName, String actionName, String targetType, String targetId, String targetName, String detail,
		boolean success, Long operatorId, String operatorUsername, String operatorDisplayName) {
		OperationLog log = new OperationLog();
		log.setModuleName(moduleName);
		log.setActionName(actionName);
		log.setTargetType(blankToNull(targetType));
		log.setTargetId(blankToNull(targetId));
		log.setTargetName(blankToNull(targetName));
		log.setDetail(blankToNull(detail));
		log.setSuccess(success);

		AppUserPrincipal principal = currentPrincipal();
		if (principal != null) {
			log.setOperatorId(principal.getId());
			log.setOperatorUsername(principal.getUsername());
			log.setOperatorDisplayName(principal.getDisplayName());
			log.setOperatorRoles(joinRoles(principal.getAuthorities().stream()
				.map(grantedAuthority -> grantedAuthority.getAuthority().replaceFirst("^ROLE_", ""))
				.toList()));
		}
		else {
			log.setOperatorId(operatorId);
			log.setOperatorUsername(blankToNull(operatorUsername));
			log.setOperatorDisplayName(blankToNull(operatorDisplayName));
		}

		HttpServletRequest request = currentRequest();
		if (request != null) {
			log.setIpAddress(blankToNull(resolveClientIp(request)));
			log.setRequestMethod(blankToNull(request.getMethod()));
			log.setRequestPath(blankToNull(request.getRequestURI()));
		}

		operationLogRepository.save(log);
	}

	private static String joinRoles(List<String> roles) {
		if (roles == null || roles.isEmpty()) {
			return null;
		}
		return roles.stream().distinct().collect(Collectors.joining(", "));
	}

	private static AppUserPrincipal currentPrincipal() {
		Object principal = SecurityContextHolder.getContext().getAuthentication() == null
			? null
			: SecurityContextHolder.getContext().getAuthentication().getPrincipal();
		return principal instanceof AppUserPrincipal appUserPrincipal ? appUserPrincipal : null;
	}

	private static HttpServletRequest currentRequest() {
		RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
		if (attributes instanceof ServletRequestAttributes servletRequestAttributes) {
			return servletRequestAttributes.getRequest();
		}
		return null;
	}

	private static String resolveClientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		return request.getRemoteAddr();
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value;
	}

	private LocalDateTime cutoffDateTime() {
		return LocalDateTime.now().minusDays(operationLogProperties.getRetentionDays());
	}

	private long cutoffEpochMillis() {
		return LocalDateTime.now()
			.minusDays(operationLogProperties.getRetentionDays())
			.atZone(java.time.ZoneId.systemDefault())
			.toInstant()
			.toEpochMilli();
	}
}
