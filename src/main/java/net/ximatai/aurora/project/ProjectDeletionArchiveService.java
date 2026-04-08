package net.ximatai.aurora.project;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import tools.jackson.databind.ObjectMapper;

@Service
public class ProjectDeletionArchiveService {

	private final ObjectMapper objectMapper;
	private final ProjectDeletionArchiveProperties properties;

	public ProjectDeletionArchiveService(ObjectMapper objectMapper, ProjectDeletionArchiveProperties properties) {
		this.objectMapper = objectMapper;
		this.properties = properties;
	}

	public String archive(Project project, List<ProjectChange> changes, List<Invoice> invoices, List<Payment> payments, String operatorUsername,
		String operatorDisplayName, boolean strongConfirmationUsed) {
		String archiveId = UUID.randomUUID().toString();
		ProjectDeletionArchivePayload payload = new ProjectDeletionArchivePayload(
			1,
			archiveId,
			LocalDateTime.now(),
			operatorUsername,
			operatorDisplayName,
			strongConfirmationUsed,
			new AssociatedDataSnapshotCounts(changes.size(), invoices.size(), payments.size()),
			new ArchivedProject(
				project.getId(),
				project.getName(),
				project.getCustomer(),
				project.getContractNo(),
				project.getSigningDate(),
				project.getContractAmount(),
				project.getResponsibleDepartment(),
				project.getUndertakingUnit(),
				project.getCategory(),
				project.getContractPeriod(),
				project.getPaymentMethod(),
				project.getRemark(),
				project.getCreatedAt(),
				project.getUpdatedAt()
			),
			changes.stream()
				.map(change -> new ArchivedProjectChange(
					change.getId(),
					change.getSummary(),
					change.getDetail(),
					change.getOperatorId(),
					change.getOperatorUsername(),
					change.getOperatorDisplayName(),
					change.getCreatedAt()
				))
				.toList(),
			invoices.stream()
				.map(invoice -> new ArchivedInvoice(
					invoice.getId(),
					invoice.getAmount(),
					invoice.getInvoiceDate(),
					invoice.getInvoiceNo(),
					invoice.getCreatedAt(),
					invoice.getUpdatedAt()
				))
				.toList(),
			payments.stream()
				.map(payment -> new ArchivedPayment(
					payment.getId(),
					payment.getAmount(),
					payment.getPaymentDate(),
					payment.getInvoice() == null ? null : payment.getInvoice().getId(),
					payment.getCreatedAt(),
					payment.getUpdatedAt()
				))
				.toList()
		);
		writePayload(payload);
		return archiveId;
	}

	private void writePayload(ProjectDeletionArchivePayload payload) {
		try {
			Path path = Path.of(properties.file());
			Path parent = path.getParent();
			if (parent != null) {
				Files.createDirectories(parent);
			}
			String json = objectMapper.writeValueAsString(payload);
			Files.writeString(path, json + System.lineSeparator(), StandardCharsets.UTF_8,
				StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND);
		}
		catch (IOException ex) {
			throw new IllegalStateException("项目删除归档写入失败", ex);
		}
	}

	private record ProjectDeletionArchivePayload(
		int schemaVersion,
		String archiveId,
		LocalDateTime deletedAt,
		String operatorUsername,
		String operatorDisplayName,
		boolean strongConfirmationUsed,
		AssociatedDataSnapshotCounts associatedDataSnapshotCounts,
		ArchivedProject project,
		List<ArchivedProjectChange> changes,
		List<ArchivedInvoice> invoices,
		List<ArchivedPayment> payments
	) {
	}

	private record AssociatedDataSnapshotCounts(
		int changeCount,
		int invoiceCount,
		int paymentCount
	) {
	}

	private record ArchivedProject(
		Long id,
		String name,
		String customer,
		String contractNo,
		LocalDate signingDate,
		BigDecimal contractAmount,
		String responsibleDepartment,
		String undertakingUnit,
		String category,
		String contractPeriod,
		String paymentMethod,
		String remark,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
	) {
	}

	private record ArchivedProjectChange(
		Long id,
		String summary,
		String detail,
		Long operatorId,
		String operatorUsername,
		String operatorDisplayName,
		LocalDateTime createdAt
	) {
	}

	private record ArchivedInvoice(
		Long id,
		BigDecimal amount,
		LocalDate invoiceDate,
		String invoiceNo,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
	) {
	}

	private record ArchivedPayment(
		Long id,
		BigDecimal amount,
		LocalDate paymentDate,
		Long invoiceId,
		LocalDateTime createdAt,
		LocalDateTime updatedAt
	) {
	}
}
