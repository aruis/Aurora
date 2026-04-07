package net.ximatai.aurora.operationlog;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.operation-log")
public class OperationLogProperties {

	private int retentionDays = 30;

	public int getRetentionDays() {
		return retentionDays;
	}

	public void setRetentionDays(int retentionDays) {
		this.retentionDays = retentionDays;
	}
}
