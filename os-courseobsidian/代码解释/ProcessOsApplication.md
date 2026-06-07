# ProcessOsApplication.java — Spring Boot 入口

**包路径：** `com.processos.ProcessOsApplication`
**注解：** `@SpringBootApplication`

---

## 职责

**Spring Boot 应用的主入口类。** `main()` 方法启动整个后端服务。

虽然代码只有 25 行，但它是整个应用的起点——`@SpringBootApplication` 注解触发了组件扫描、自动配置、内嵌 Tomcat 启动等全部过程。

---

## 核心功能

```java
@SpringBootApplication
public class ProcessOsApplication {

    @Autowired
    private HardwarePool hardwarePool;    // 硬件资源池

    @Autowired
    private ProcessManager processManager; // 进程管理器

    public static void main(String[] args) {
        SpringApplication.run(ProcessOsApplication.class, args);
    }
}
```

### `@SpringBootApplication` = 三个注解的组合

| 注解 | 作用 |
|------|------|
| `@SpringBootConfiguration` | 标记为 Spring Boot 配置类 |
| `@EnableAutoConfiguration` | 启用自动配置（根据依赖自动配置 Tomcat、JPA、Jackson 等） |
| `@ComponentScan` | 扫描 `com.processos` 包下的所有 `@Component`/`@Service`/`@Controller` 等 |

---

## 自动注入的字段

```java
@Autowired
private HardwarePool hardwarePool;    // 硬件资源池

@Autowired
private ProcessManager processManager; // 进程管理器
```

这两个字段虽然在这个类中没有被直接使用（没有调用它们的方法），但 Spring 在创建 `ProcessOsApplication` 的 bean 时仍然会注入它们。

**为什么存在？** 可能是为了：
1. **强制初始化**：确保 `HardwarePool` 和 `ProcessManager` 在应用启动时就被创建（虽然 `@Component` 已经保证了这一点）
2. **调试/监控预留**：方便在 `main` 方法或 `@PostConstruct` 中获取这些核心组件

---

## 启动流程

```
main()
    │
    └── SpringApplication.run(ProcessOsApplication.class)
            │
            ├── 1. 加载 application.properties
            ├── 2. 扫描 @Component 等注解
            ├── 3. 自动配置 DataSource（MySQL）
            ├── 4. 自动配置 JPA（EntityManager）
            ├── 5. 自动配置 Tomcat（内嵌 Web 服务器）
            ├── 6. 初始化所有 Bean（HardwarePool / ProcessManager 等）
            ├── 7. 注册 Servlet（DispatcherServlet）
            └── 8. 监听 9090 端口，等待 HTTP 请求
```

---

## 注释说明

```java
/**
 * 进程管理系统 - Spring Boot主类
 * tick由前端轮询 /api/system/run 驱动，无后台定时任务
 */
```

这个注释说明了项目的一个**重要设计决策**：没有使用 `@Scheduled` 或 `TimerTask` 等后台定时任务，所有 tick 推进都由前端 500ms 间隔的 `POST /api/system/run` 轮询驱动。

---

## 运行方式

```bash
cd backend
mvn spring-boot:run        # 开发模式
mvn clean package           # 打包 JAR
java -jar target/*.jar      # 运行 JAR
```

应用启动后：
- **端口：** 9090（由 `application.properties` 的 `server.port=9090` 指定）
- **API 基地址：** `http://localhost:9090/api/`
- **前端：** `http://localhost:3000/`（Vite 开发服务器，代理 API 到 9090）
