package net.ximatai.aurora.auth;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import net.ximatai.aurora.user.AppUserRepository;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {

	private final AppUserRepository userRepository;

	public DatabaseUserDetailsService(AppUserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		return userRepository.findByUsername(username)
			.map(AppUserPrincipal::from)
			.orElseThrow(() -> new UsernameNotFoundException("用户名或密码错误"));
	}
}
