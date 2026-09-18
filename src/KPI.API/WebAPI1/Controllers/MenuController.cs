using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Entities;
using Microsoft.AspNetCore.Authorization;
using WebAPI1.Authorization;
using WebAPI1.Context;

namespace WebAPI1.Controllers
{
    [Route("[controller]")]
    [ApiController]
    [Authorize]
    [RequireAccessToken]
    public class MenuController : ControllerBase
    {
        private readonly ISHAuditDbcontext _db;

        public MenuController(ISHAuditDbcontext db)
        {
            _db = db;
        }

        /// <summary>
        /// 取得使用者對應的選單
        /// </summary>
        
        public class MenuItem
        {
            public int Id { get; set; }
            public string Label { get; set; }
            public string Link { get; set; }
            public string? Icon { get; set; }
            public int? ParentId { get; set; }
            public int SortOrder { get; set; }
            public int IsActive { get; set; }
            public string MenuType { get; set; }
            public List<MenuItem> Children { get; set; } = new();
        }

        // 新增/更新用的 DTO
        public class MenuDto
        {
            public string  Label     { get; set; } = "";
            public string  Link      { get; set; } = "";
            public string? Icon      { get; set; }
            public int?    ParentId  { get; set; }
            public int     SortOrder { get; set; }
            public int     IsActive  { get; set; }  // 0=啟用, 1=停用
            public string  MenuType  { get; set; } = "";
        }
        
        [HttpGet("GetMenus")]
        public IActionResult GetMenus()
        {
            var menuItems = _db.Menus.Where(m => m.IsActive == 0).ToList();

            var menuTree = menuItems
                .Where(m => m.ParentId == null) // 找出所有主選單
                .Select(m => new MenuItem
                {
                    Id = m.Id,
                    Label = m.Lable,
                    Link = m.Link,
                    Icon = m.Icon,
                    ParentId = m.ParentId,
                    SortOrder = m.SortOrder,
                    IsActive = m.IsActive,
                    MenuType = m.MenuType,
                    Children = GetChildren(menuItems, m.Id) // 取得子選單
                })
                .OrderBy(m => m.SortOrder)
                .ToList();

            return Ok(menuTree);
        }
        
        /// <summary>管理用：取得全部選單（含停用），供後台 CRUD 使用</summary>
        [HttpGet("admin/all")]
        public IActionResult GetAllMenus()
        {
            var list = _db.Menus
                .OrderBy(m => m.ParentId == null ? 0 : 1)
                .ThenBy(m => m.SortOrder)
                .Select(m => new MenuItem
                {
                    Id = m.Id, Label = m.Lable, Link = m.Link, Icon = m.Icon,
                    ParentId = m.ParentId, SortOrder = m.SortOrder,
                    IsActive = m.IsActive, MenuType = m.MenuType,
                })
                .ToList();
            return Ok(list);
        }

        /// <summary>新增選單</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MenuDto dto)
        {
            var menu = new Menu
            {
                Lable     = dto.Label,
                Link      = dto.Link,
                Icon      = dto.Icon,
                ParentId  = dto.ParentId,
                SortOrder = dto.SortOrder,
                IsActive  = dto.IsActive,
                MenuType  = dto.MenuType,
                CreatedAt = DateTime.UtcNow,
                UpdateAt  = DateTime.UtcNow,
            };
            _db.Menus.Add(menu);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, id = menu.Id });
        }

        /// <summary>更新選單</summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] MenuDto dto)
        {
            var menu = await _db.Menus.FindAsync(id);
            if (menu == null) return NotFound(new { message = "選單不存在" });
            menu.Lable     = dto.Label;
            menu.Link      = dto.Link;
            menu.Icon      = dto.Icon;
            menu.ParentId  = dto.ParentId;
            menu.SortOrder = dto.SortOrder;
            menu.IsActive  = dto.IsActive;
            menu.MenuType  = dto.MenuType;
            menu.UpdateAt  = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        /// <summary>刪除選單</summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var menu = await _db.Menus.FindAsync(id);
            if (menu == null) return NotFound(new { message = "選單不存在" });
            _db.Menus.Remove(menu);
            await _db.SaveChangesAsync();
            return Ok(new { success = true });
        }

        private List<MenuItem> GetChildren(List<Menu> menuItems, int parentId)
        {
            return menuItems
                .Where(m => m.ParentId == parentId)
                .Select(m => new MenuItem
                {
                    Id = m.Id,
                    Label = m.Lable,
                    Link = m.Link,
                    Icon = m.Icon,
                    ParentId = m.ParentId,
                    SortOrder = m.SortOrder,
                    IsActive = m.IsActive,
                    MenuType = m.MenuType,
                    Children = GetChildren(menuItems, m.Id)
                })
                .OrderBy(m => m.SortOrder)
                .ToList();
        }
    }
}