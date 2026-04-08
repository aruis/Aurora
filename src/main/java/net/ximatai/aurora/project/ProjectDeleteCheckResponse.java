package net.ximatai.aurora.project;

public record ProjectDeleteCheckResponse(
	boolean requiresStrongConfirmation,
	boolean hasProjectChanges,
	boolean hasInvoices,
	boolean hasPayments,
	String contractNo
) {
}
