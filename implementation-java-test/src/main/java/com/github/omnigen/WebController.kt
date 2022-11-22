package com.github.omnigen

import com.github.omnigen.model.SimplePojo
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping(value = ["/"])
class WebController {

  @GetMapping
  fun get(): SimplePojo {
    return SimplePojo("A Name")
  }
}
