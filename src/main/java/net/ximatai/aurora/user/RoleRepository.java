package net.ximatai.aurora.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import net.ximatai.aurora.common.RoleCode;

public interface RoleRepository extends JpaRepository<Role, Long> {

	List<Role> findByCodeIn(Collection<RoleCode> codes);

	Optional<Role> findByCode(RoleCode code);
}
