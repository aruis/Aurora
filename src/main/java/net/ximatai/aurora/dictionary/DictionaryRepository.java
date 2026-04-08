package net.ximatai.aurora.dictionary;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DictionaryRepository extends JpaRepository<DictionaryEntry, Long> {

	List<DictionaryEntry> findByTypeOrderBySortOrderAscIdAsc(DictionaryType type);

	List<DictionaryEntry> findByTypeAndEnabledTrueOrderBySortOrderAscIdAsc(DictionaryType type);

	Optional<DictionaryEntry> findByTypeAndCode(DictionaryType type, String code);

	boolean existsByTypeAndCode(DictionaryType type, String code);
}
