package com.github.omnigen

import org.springframework.web.WebApplicationInitializer
import org.springframework.web.context.ContextLoaderListener
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext
import org.springframework.web.context.support.GenericWebApplicationContext
import org.springframework.web.servlet.DispatcherServlet
import javax.servlet.ServletContext

class Config : WebApplicationInitializer {
  override fun onStartup(sc: ServletContext) {

    val root = AnnotationConfigWebApplicationContext()
    root.register(WebConfig::class.java)
    root.refresh()
    root.servletContext = sc
    sc.addListener(ContextLoaderListener(root))

    val dv = DispatcherServlet(GenericWebApplicationContext())

    val appServlet = sc.addServlet("test-mvc", dv)
    appServlet.setLoadOnStartup(1)
    appServlet.addMapping("/*")
  }
}
