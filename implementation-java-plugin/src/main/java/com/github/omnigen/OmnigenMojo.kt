package com.github.omnigen

import com.fasterxml.jackson.core.io.JsonStringEncoder
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import com.github.omnigen.CommandHelper.executeCommand
import org.apache.commons.io.FileUtils
import org.apache.commons.lang3.StringUtils
import org.apache.commons.lang3.SystemUtils
import org.apache.maven.execution.MavenSession
import org.apache.maven.model.Dependency
import org.apache.maven.model.Plugin
import org.apache.maven.model.PluginExecution
import org.apache.maven.plugin.AbstractMojo
import org.apache.maven.plugin.BuildPluginManager
import org.apache.maven.plugin.MojoExecution
import org.apache.maven.plugins.annotations.*
import org.apache.maven.project.MavenProject
import org.codehaus.plexus.util.xml.Xpp3Dom
import org.codehaus.plexus.util.xml.Xpp3DomUtils
import org.twdata.maven.mojoexecutor.MavenCompatibilityHelper
import org.twdata.maven.mojoexecutor.MojoExecutor
import org.twdata.maven.mojoexecutor.MojoExecutor.ExecutionEnvironment
import org.twdata.maven.mojoexecutor.PlexusConfigurationUtils
import java.io.File
import java.util.*
import kotlin.collections.ArrayList

@Mojo(
  name = "omnigen",
  defaultPhase = LifecyclePhase.GENERATE_SOURCES,
  requiresDependencyResolution = ResolutionScope.RUNTIME,
  requiresDependencyCollection = ResolutionScope.RUNTIME,
  threadSafe = true
)
class OmnigenMojo : AbstractMojo() {
  @Parameter(defaultValue = "\${project}", required = true, readonly = true)
  private val mavenProject: MavenProject? = null

  @Parameter(defaultValue = "\${session}", readonly = true)
  private val mavenSession: MavenSession? = null

  @Component
  private val pluginManager: BuildPluginManager? = null

  @Parameter(property = "omnigen.npmInstallPath")
  private lateinit var npmInstallPath: File

  @Parameter(property = "omnigen.nodeInstallVersion")
  private val nodeInstallVersion: String = "16.15.1"

  @Parameter(property = "omnigen.nodeDiscoverInstall", defaultValue = "true")
  var nodeDiscoverInstall = true

  @Parameter(property = "omnigen.projectBaseDir", defaultValue = "\${project.basedir}")
  private lateinit var projectBaseDir: File

  @Parameter(property = "omnigen.generatedResourcesBaseDir", defaultValue = "\${project.build.directory}/generated-resources")
  private lateinit var generatedResourcesBaseDir: File

  @Parameter(property = "omnigen.generatedSourcesBaseDir", defaultValue = "\${project.build.directory}/generated-sources")
  private lateinit var generatedSourcesBaseDir: File

  @Parameter(property = "omnigen.generatedDocsBaseDir", defaultValue = "\${project.build.directory}/generated-snippets")
  private lateinit var generatedDocsBaseDir: File

  @Parameter(property = "omnigen.generatedTestSourcesBaseDir", defaultValue = "\${project.build.directory}/generated-test-sources")
  private lateinit var generatedTestSourcesBaseDir: File

  @Parameter(property = "omnigen.projectBuildTargetDir", defaultValue = "\${project.build.directory}/classes")
  private lateinit var projectTargetClassesDir: File

  @Parameter(property = "nodeWorkingPath")
  private var nodeWorkingPath: File? = null

  override fun execute() {

    if (nodeWorkingPath == null) {
      nodeWorkingPath = File(getBasePomDirectory(projectBaseDir), ".npm.work")
    }

//    if (shouldDownloadNode()) {
//
//      log.info("Node install directory is '${npmInstallPath?.absolutePath}'. Will download")
//
//      val plugin = plugin(
//        "com.github.eirslett",
//        "frontend-maven-plugin",
//        "1.12.1"
//      )
//      plugin.extensions = "true"
//      val configuration = MojoExecutor.configuration(
//        MojoExecutor.element(MojoExecutor.name("installDirectory"), npmInstallPath!!.absolutePath),
//        MojoExecutor.element(MojoExecutor.name("nodeVersion"), nodeInstallVersion)
//      )
//
//      try {
//        executeCustomPlugin(
//          "install-node-and-npm",
//          plugin, configuration,
//          MojoExecutor.executionEnvironment(mavenProject, mavenSession, pluginManager)
//        )
//        npmInstallPath = getNpmFileInDirectory(File(npmInstallPath, "node"))
//      } catch (ex: Exception) {
//        throw RuntimeException(ex)
//      }
//
////      executeNodePlugin("install")
//
//    } else {
//      log.info("""Node install directory was discovered or auto-determined to be '${npmInstallPath!!.absolutePath}'. Will use it""")
//    }

    val objectMapper = ObjectMapper()
    val optionsJson: ObjectNode = objectMapper.createObjectNode()
    optionsJson.put("targetDir", generatedSourcesBaseDir.absolutePath)

    val options = "\"" + objectMapper.writeValueAsString(optionsJson) + "\""

    // At this point node is installed, and we should have a proper path to the node executable

    executeNodePlugin("run", "generate", "--", options)

  }

  private fun executeNodePlugin(vararg arguments: String) {

    val plugin = MojoExecutor.plugin(
      "org.codehaus.mojo",
      "exec-maven-plugin",
      "3.1.0"
    )
    plugin.extensions = "true"

    val npmFile: File = if (npmInstallPath.isDirectory) {
      getNpmFileInDirectory(npmInstallPath)
    } else {
      npmInstallPath
    }

    val workingAbsolutePath = nodeWorkingPath!!.absolutePath;

    val executablePath = npmFile.absolutePath
    log.info("Will run: '" + executablePath + "' '" + arguments.joinToString("' + '") + "' in '" + workingAbsolutePath + "'")
    log.info("$mavenProject $mavenSession $pluginManager");
    val executionMain = PluginExecution()
    executionMain.id = "npm"
    executionMain.goals = ArrayList()
    executionMain.goals.add("exec")

    val argumentList = ArrayList<MojoExecutor.Element>();
    for (argument in arguments) {
      argumentList.add(MojoExecutor.element("argument", argument))
    }

    plugin.addExecution(executionMain)
    val configuration = MojoExecutor.configuration(
      MojoExecutor.element("workingDirectory", workingAbsolutePath),
      MojoExecutor.element("executable", executablePath),
      MojoExecutor.element("arguments", *argumentList.toArray(arrayOf<MojoExecutor.Element>()))
    )

    executeCustomPlugin("exec", plugin, configuration, MojoExecutor.executionEnvironment(mavenProject, mavenSession, pluginManager))
  }

  @Throws(Exception::class)
  private fun executeCustomPlugin(goal: String?, plugin: Plugin?, configuration: Xpp3Dom?, env: ExecutionEnvironment) {

    val pluginDescriptor = MavenCompatibilityHelper.loadPluginDescriptor(plugin, env, env.mavenSession)
    val mojoDescriptor = pluginDescriptor.getMojo(goal)
    val domConfiguration = Xpp3DomUtils.mergeXpp3Dom(configuration, PlexusConfigurationUtils.toXpp3Dom(mojoDescriptor.mojoConfiguration))
    val exec = MojoExecution(mojoDescriptor, domConfiguration)

    env.pluginManager.executeMojo(env.mavenSession, exec)
  }

  private fun getNpmFileInDirectory(directory: File): File {
    val npmFileName = if (SystemUtils.IS_OS_WINDOWS) "npm.cmd" else "npm"
    return File(directory, npmFileName)
  }

//  private fun shouldDownloadNode(): Boolean {
//
//    if (npmInstallPath == null) {
//      val potentialPaths = LinkedHashSet<File>()
//
//      // TODO: If node is already installed, we should use that instead!
//      //  And execute it using exec-maven-plugin!
//      //  Needs to look into how to copy into the working directory/etc
//      if (nodeDiscoverInstall) {
//
//        val whereCommand: String = if (SystemUtils.IS_OS_WINDOWS) {
//          "where"
//        } else {
//          "which"
//        }
//
//        val potentialExtensions = if (SystemUtils.IS_OS_WINDOWS) arrayOf(".cmd", ".bat") else arrayOf(".sh", "")
//        for (file in getLookupPathResults("$whereCommand npm")) {
//          if (Arrays.stream(potentialExtensions).anyMatch { ext: String? -> file.name.endsWith(ext!!) }) {
//            potentialPaths.add(file.absoluteFile)
//          }
//        }
//        if (potentialPaths.isEmpty()) {
//
//          val pathValue = StringUtils.defaultIfEmpty(
//            System.getProperty("Path", null),
//            System.getProperty("PATH", null)
//          )
//
//          val entries = StringUtils.split(pathValue, ";");
//          if (entries != null) {
//            for (entry in entries) {
//              val entryFile = File(StringUtils.trim(entry))
//              for (ext in potentialExtensions) {
//                val exeFile = File(entryFile, "npm$ext")
//                if (exeFile.exists()) {
//                  potentialPaths.add(exeFile.parentFile.absoluteFile)
//                }
//              }
//            }
//          }
//        }
//        if (potentialPaths.size > 1) {
//          val paths = StringUtils.join(potentialPaths, ", ");
//          log.warn("There were multiple available node choices. Will pick the first of: $paths")
//        }
//      }
//
//      if (potentialPaths.isEmpty()) {
//        npmInstallPath = File(getBasePomDirectory(projectBaseDir), ".npm")
//        if (!npmInstallPath!!.exists()) {
//          try {
//            FileUtils.forceMkdir(npmInstallPath)
//          } catch (ex: Exception) {
//            throw RuntimeException(ex)
//          }
//        }
//
//        return true;
//
//      } else {
//
//        for (potentialPath in potentialPaths) {
//          log.info("Found potential path: $potentialPath")
//        }
//
//        for (potentialPath in potentialPaths) {
//          npmInstallPath = potentialPath
//          return false
//        }
//      }
//
//    } else {
//
//      val givenInstallPath = npmInstallPath!!
//      if (!givenInstallPath.exists()) {
//        return true
//      } else {
//        if (givenInstallPath.exists() && givenInstallPath.isFile) {
//
//          // This is a file, so we will presume it is pointing straight on the npm executable.
//          return false
//        } else {
//
//          // Directory created by frontend plugin.
//          // It will not exist if we've pointed to an own, custom installation.
//          // But it will most likely exist if we're using the automatic installer.
//          val nodeDirectory = File(givenInstallPath, "node")
//          val path = if (nodeDirectory.exists() && nodeDirectory.isDirectory) nodeDirectory else givenInstallPath
//          return if (SystemUtils.IS_OS_WINDOWS) {
//            !File(path, "node.exe").exists()
//          } else {
//            !File(path, "node").exists()
//          }
//        }
//      }
//    }
//
//    return true
//  }

  private fun getBasePomDirectory(directory: File?): File? {

    if (directory == null) {
      return null;
    }

    var mostCommonPomDirectory: File = directory
    var pointer: File? = directory.absoluteFile
    while (pointer != null) {
      val pomFile = File(pointer, "pom.xml")
      if (pomFile.exists()) {
        mostCommonPomDirectory = pointer
      }
      pointer = pointer.parentFile
    }

    log.info("Base POM directory: ${mostCommonPomDirectory.absolutePath}")
    return mostCommonPomDirectory
  }

  private fun getLookupPathResults(command: String): Collection<File> {
    val filteredResult = ArrayList<File>()
    try {
      val result = executeCommand(command)
      for (line in result.outputLines) {
        if (StringUtils.isNotBlank(line)) {
          val potentialFile = File(line)
          if (potentialFile.exists()) {
            filteredResult.add(potentialFile.absoluteFile)
          }
        }
      }
    } catch (ex: Exception) {
      log.warn("Could not run '$command' will try another way")
    }
    return filteredResult
  }

  companion object {
    @JvmOverloads
    fun plugin(
      groupId: String?,
      artifactId: String?,
      version: String?,
      dependencies: List<Dependency?>? = emptyList<Dependency>()
    ): Plugin {
      val plugin = Plugin()
      plugin.artifactId = artifactId
      plugin.groupId = groupId
      plugin.version = version
      plugin.dependencies = dependencies
      return plugin
    }
  }
}
