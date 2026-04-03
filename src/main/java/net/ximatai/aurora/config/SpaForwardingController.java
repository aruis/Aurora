package net.ximatai.aurora.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardingController {

	@GetMapping({"/", "/login", "/dashboard", "/projects", "/projects/{projectId:\\d+}", "/users"})
	public String forward() {
		return "forward:/index.html";
	}
}
