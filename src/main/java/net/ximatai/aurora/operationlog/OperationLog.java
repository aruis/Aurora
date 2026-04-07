package net.ximatai.aurora.operationlog;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "operation_logs")
public class OperationLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "module_name", nullable = false, length = 64)
	private String moduleName;

	@Column(name = "action_name", nullable = false, length = 64)
	private String actionName;

	@Column(name = "target_type", length = 64)
	private String targetType;

	@Column(name = "target_id", length = 64)
	private String targetId;

	@Column(name = "target_name", length = 255)
	private String targetName;

	@Column(length = 1000)
	private String detail;

	@Column(name = "operator_id")
	private Long operatorId;

	@Column(name = "operator_username", length = 64)
	private String operatorUsername;

	@Column(name = "operator_display_name", length = 64)
	private String operatorDisplayName;

	@Column(name = "operator_roles", length = 255)
	private String operatorRoles;

	@Column(name = "ip_address", length = 64)
	private String ipAddress;

	@Column(name = "request_method", length = 16)
	private String requestMethod;

	@Column(name = "request_path", length = 255)
	private String requestPath;

	@Column(nullable = false)
	private boolean success = true;

	@Column(name = "operated_at", nullable = false)
	@Convert(converter = LocalDateTimeEpochMillisConverter.class)
	private LocalDateTime operatedAt;

	@PrePersist
	void prePersist() {
		if (operatedAt == null) {
			operatedAt = LocalDateTime.now();
		}
	}

	public Long getId() {
		return id;
	}

	public String getModuleName() {
		return moduleName;
	}

	public void setModuleName(String moduleName) {
		this.moduleName = moduleName;
	}

	public String getActionName() {
		return actionName;
	}

	public void setActionName(String actionName) {
		this.actionName = actionName;
	}

	public String getTargetType() {
		return targetType;
	}

	public void setTargetType(String targetType) {
		this.targetType = targetType;
	}

	public String getTargetId() {
		return targetId;
	}

	public void setTargetId(String targetId) {
		this.targetId = targetId;
	}

	public String getTargetName() {
		return targetName;
	}

	public void setTargetName(String targetName) {
		this.targetName = targetName;
	}

	public String getDetail() {
		return detail;
	}

	public void setDetail(String detail) {
		this.detail = detail;
	}

	public Long getOperatorId() {
		return operatorId;
	}

	public void setOperatorId(Long operatorId) {
		this.operatorId = operatorId;
	}

	public String getOperatorUsername() {
		return operatorUsername;
	}

	public void setOperatorUsername(String operatorUsername) {
		this.operatorUsername = operatorUsername;
	}

	public String getOperatorDisplayName() {
		return operatorDisplayName;
	}

	public void setOperatorDisplayName(String operatorDisplayName) {
		this.operatorDisplayName = operatorDisplayName;
	}

	public String getOperatorRoles() {
		return operatorRoles;
	}

	public void setOperatorRoles(String operatorRoles) {
		this.operatorRoles = operatorRoles;
	}

	public String getIpAddress() {
		return ipAddress;
	}

	public void setIpAddress(String ipAddress) {
		this.ipAddress = ipAddress;
	}

	public String getRequestMethod() {
		return requestMethod;
	}

	public void setRequestMethod(String requestMethod) {
		this.requestMethod = requestMethod;
	}

	public String getRequestPath() {
		return requestPath;
	}

	public void setRequestPath(String requestPath) {
		this.requestPath = requestPath;
	}

	public boolean isSuccess() {
		return success;
	}

	public void setSuccess(boolean success) {
		this.success = success;
	}

	public LocalDateTime getOperatedAt() {
		return operatedAt;
	}

	public void setOperatedAt(LocalDateTime operatedAt) {
		this.operatedAt = operatedAt;
	}
}
