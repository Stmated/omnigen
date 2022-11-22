package com.github.omnigen

import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.StringUtils
import org.slf4j.LoggerFactory
import java.nio.charset.StandardCharsets
import java.util.ArrayList

object CommandHelper {
  private val log = LoggerFactory.getLogger(CommandHelper::class.java)

  @JvmStatic
  @Throws(Exception::class)
  fun executeCommand(command: String?): Result {
    log.info("Executing: {}", command)
    val p = Runtime.getRuntime().exec(command)
    val result = Result()
    p.errorStream.use { stream ->
      result.errorLines = IOUtils.readLines(stream, StandardCharsets.UTF_8)
      if (result.errorLines.isNotEmpty()) {
        log.error("Error: {}", StringUtils.join(result.errorLines, "\n"))
      }
    }
    p.inputStream.use { stream ->
      result.outputLines = IOUtils.readLines(stream, StandardCharsets.UTF_8)
      if (result.outputLines.isNotEmpty()) {
        log.info("Output: {}", StringUtils.join(result.outputLines, "\n"))
      }
    }
    return result
  }

  class Result {
    var outputLines: List<String> = ArrayList<String>()
    var errorLines: List<String> = ArrayList<String>()
  }
}
